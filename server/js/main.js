const fs = require('fs');
const Log = require('log');
const _ = require('underscore');
const Metrics = require('./metrics');

let log = new Log('info');

function main(config) {
    try {
        const ws = require('./ws');
        const WorldServer = require('./worldserver');

        if (!config || !config.host || !config.port || !config.nb_worlds) {
            log.error("Configuration invalide : host, port, nb_worlds sont requis");
            process.exit(1);
        }

        const server = new ws.socketIOServer(config.host, config.port);
        const metrics = config.metrics_enabled ? new Metrics(config) : null;
        const worlds = [];
        let lastTotalPlayers = 0;

        setInterval(() => {
            if (metrics?.isReady) {
                metrics.getTotalPlayers((totalPlayers) => {
                    if (totalPlayers !== lastTotalPlayers) {
                        lastTotalPlayers = totalPlayers;
                        worlds.forEach(world => world.updatePopulation(totalPlayers));
                    }
                });
            }
        }, 1000);

        switch (config.debug_level) {
            case "error":
            case "debug":
            case "info":
                log = new Log(config.debug_level, process.stdout);
                break;
            default:
                log = new Log('info', process.stdout);
        }

        console.log("Starting BrowserQuest game server...");

        server.onConnect((connection) => {
            try {
                let world;

                const connect = () => {
                    if (world) {
                        const Player = require('./player');
                        world.connect_callback(new Player(connection, world));
                    }
                };

                if (metrics) {
                    metrics.getOpenWorldCount((openWorldCount) => {
                        const openWorlds = _.first(worlds, openWorldCount);
                        world = _.min(openWorlds, w => w.playerCount || 0);
                        connect();
                    });
                } else {
                    world = _.find(worlds, w => w.playerCount < config.nb_players_per_world);
                    if (world) {
                        world.updatePopulation();
                        connect();
                    } else {
                        log.warning("Aucun monde disponible pour une nouvelle connexion.");
                        connection.sendUTF8("server_full");
                        connection.close();
                    }
                }
            } catch (err) {
                log.error("Erreur lors de la connexion d'un client: " + err.message);
            }
        });

        server.onError((...args) => {
            console.error("Erreur serveur: ", ...args);
        });

        const onPopulationChange = () => {
            if (!metrics) return;
            metrics.updatePlayerCounters(worlds, (totalPlayers) => {
                worlds.forEach(world => world.updatePopulation(totalPlayers));
            });
            metrics.updateWorldDistribution(getWorldDistribution(worlds));
        };

        _.range(config.nb_worlds).forEach(i => {
            const world = new WorldServer(`world${i + 1}`, config.nb_players_per_world, server);
            world.run(config.map_filepath);
            worlds.push(world);

            if (metrics) {
                world.onPlayerAdded(onPopulationChange);
                world.onPlayerRemoved(onPopulationChange);
            }
        });

        server.onRequestStatus(() => {
            return JSON.stringify(getWorldDistribution(worlds));
        });

        if (metrics) {
            metrics.ready(() => {
                onPopulationChange();
            });
        }

        process.on('uncaughtException', (e) => {
            console.error("⛔ Uncaught Exception:", e.stack || e.message || e);
        });

        process.on('SIGINT', () => {
            console.log("\nServeur arrêté proprement.");
            process.exit(0);
        });

    } catch (error) {
        console.error("Erreur critique au démarrage du serveur:", error.message);
        process.exit(1);
    }
}

function getWorldDistribution(worlds) {
    return worlds.map(world => world.playerCount || 0);
}

function getConfigFile(path, callback) {
    fs.readFile(path, 'utf8', (err, data) => {
        if (err) {
            console.error(`❌ Impossible de lire le fichier de config ${path}:`, err.message);
            return callback(null);
        }

        try {
            const json = JSON.parse(data);
            callback(json);
        } catch (parseErr) {
            console.error(`❌ Erreur de parsing JSON dans ${path}:`, parseErr.message);
            callback(null);
        }
    });
}

const defaultConfigPath = './server/config.json';
let customConfigPath = './server/config_local.json';

if (process.argv[2]) {
    customConfigPath = process.argv[2];
}

getConfigFile(defaultConfigPath, (defaultConfig) => {
    getConfigFile(customConfigPath, (localConfig) => {
        if (localConfig) {
            main(localConfig);
        } else if (defaultConfig) {
            main(defaultConfig);
        } else {
            console.error("❌ Aucune configuration valide trouvée. Arrêt du serveur.");
            process.exit(1);
        }
    });
});
