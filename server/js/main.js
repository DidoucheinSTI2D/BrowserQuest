var fs = require('fs'),
    Metrics = require('./metrics'),
    Log = require('log'),
    _ = require('underscore');

async function readConfigFile(path) {
    try {
        const data = await fs.promises.readFile(path, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Could not open config file:", err.path);
        return null;
    }
}

function main(config) {
    const ws = require("./ws"),
          WorldServer = require("./worldserver"),
          server = new ws.socketIOServer(config.host, config.port),
          metrics = config.metrics_enabled ? new Metrics(config) : null;
    
    let worlds = [],
        lastTotalPlayers = 0;

    const checkPopulationInterval = setInterval(() => {
        if (metrics && metrics.isReady) {
            metrics.getTotalPlayers(async (totalPlayers) => {
                if (totalPlayers !== lastTotalPlayers) {
                    lastTotalPlayers = totalPlayers;
                    // Update all worlds with new player count
                    for (let world of worlds) {
                        await world.updatePopulation(totalPlayers);
                    }
                }
            });
        }
    }, 1000);

    const log = new Log(console.log);
    
    console.log("Starting BrowserQuest game server...");

    server.onConnect(function(connection) {
        let world;
        
        const connect = () => {
            if (world) {
                world.connect_callback(new Player(connection, world));
            }
        };

        if (metrics) {
            metrics.getOpenWorldCount(async (open_world_count) => {
                // Choose the least populated world among open worlds
                world = _.min(_.first(worlds, open_world_count), (w) => w.playerCount);
                connect();
            });
        } else {
            // Fill each world sequentially until they are full
            world = _.find(worlds, (world) => world.playerCount < config.nb_players_per_world);
            world.updatePopulation();
            connect();
        }
    });

    server.onError(function() {
        console.log(Array.prototype.join.call(arguments, ", "));
    });

    const onPopulationChange = async () => {
        if (metrics) {
            await metrics.updatePlayerCounters(worlds, async (totalPlayers) => {
                for (let world of worlds) {
                    await world.updatePopulation(totalPlayers);
                }
            });
            metrics.updateWorldDistribution(getWorldDistribution(worlds));
        }
    };

    // Create worlds
    _.each(_.range(config.nb_worlds), function(i) {
        const world = new WorldServer('world' + (i + 1), config.nb_players_per_world, server);
        world.run(config.map_filepath);
        worlds.push(world);

        if (metrics) {
            world.onPlayerAdded(onPopulationChange);
            world.onPlayerRemoved(onPopulationChange);
        }
    });

    // Request server status
    server.onRequestStatus(function() {
        return JSON.stringify(getWorldDistribution(worlds));
    });

    // Initialize counters once metrics are ready
    if (config.metrics_enabled) {
        metrics.ready(async () => {
            await onPopulationChange(); // Initialize all counters to 0 when the server starts
        });
    }

    // Handle uncaught exceptions
    process.on('uncaughtException', function(e) {
        console.log('uncaughtException: ' + e);
    });
}

// Get distribution of players across worlds
function getWorldDistribution(worlds) {
    return worlds.map(world => world.playerCount);
}

async function initConfig() {
    const defaultConfigPath = './server/config.json';
    const customConfigPath = './server/config_local.json';

    let defaultConfig = await readConfigFile(defaultConfigPath);
    let localConfig = await readConfigFile(customConfigPath);

    if (localConfig) {
        main(localConfig);
    } else if (defaultConfig) {
        main(defaultConfig);
    } else {
        console.error("Server cannot start without any configuration file.");
        process.exit(1);
    }
}

initConfig();
