define(['jquery', 'app'], function($, App) {
    var app, game;

    var initApp = function() {
        $(document).ready(function() {
            app = new App();
            app.center();

            if (Detect.isWindows()) {
                // Workaround for graphical glitches on text
                $('body').addClass('windows');
            }

            if (Detect.isOpera()) {
                // Fix for no pointer events
                $('body').addClass('opera');
            }

            setupEventHandlers();
            initializePlayerData();
            initGame();
        });
    };

    var setupEventHandlers = function() {
        // Event handlers for various UI elements
        $('#chatbutton').click(toggleChat);
        $('#helpbutton').click(() => app.toggleAbout());
        $('#achievementsbutton').click(toggleAchievements);
        $('#instructions').click(() => app.hideWindows());
        $('#playercount').click(togglePopulationInfo);
        $('#population').click(togglePopulationInfo);
        $('#toggle-credits').click(() => app.toggleCredits());
        $('#create-new span').click(() => app.animateParchment('loadcharacter', 'confirmation'));
        $('.delete').click(deleteStorage);
        $('#cancel span').click(() => app.animateParchment('confirmation', 'loadcharacter'));
        $('.ribbon').click(() => app.toggleAbout());
        $('#nameinput').bind("keyup", () => app.toggleButton());
        $('#previous').click(changePage(-1));
        $('#next').click(changePage(1));
        $('#notifications div').bind(TRANSITIONEND, app.resetMessagesPosition.bind(app));
        $('.close').click(() => app.hideWindows());
        $('.twitter').click(openSocialPopup('twitter'));
        $('.facebook').click(openSocialPopup('facebook'));
    };

    var toggleChat = function() {
        if ($('#chatbutton').hasClass('active')) {
            app.showChat();
        } else {
            app.hideChat();
        }
    };

    var toggleAchievements = function() {
        app.toggleAchievements();
        if (app.blinkInterval) {
            clearInterval(app.blinkInterval);
        }
        $(this).removeClass('blink');
    };

    var togglePopulationInfo = function() {
        app.togglePopulationInfo();
    };

    var deleteStorage = function() {
        app.storage.clear();
        app.animateParchment('confirmation', 'createcharacter');
    };

    var changePage = function(direction) {
        return function() {
            var $achievements = $('#achievements');
            if (app.currentPage === 1 && direction === -1 || app.currentPage === $('#lists').children('ul').length && direction === 1) {
                return false;
            } else {
                app.currentPage += direction;
                $achievements.removeClass().addClass('active page' + app.currentPage);
            }
        };
    };

    var openSocialPopup = function(platform) {
        return function() {
            var url = $(this).attr('href');
            app.openPopup(platform, url);
            return false;
        };
    };

    var initializePlayerData = function() {
        var data = app.storage.data;
        if (data.hasAlreadyPlayed) {
            if (data.player.name && data.player.name !== "") {
                $('#playername').html(data.player.name);
                $('#playerimage').attr('src', data.player.image);
            }
        }

        $('.play div').click(function(event) {
            var nameFromInput = $('#nameinput').val(),
                nameFromStorage = $('#playername').html(),
                name = nameFromInput || nameFromStorage;

            app.tryStartingGame(name);
        });

        $('#resize-check').bind("transitionend", app.resizeUi.bind(app));
        $('#resize-check').bind("webkitTransitionEnd", app.resizeUi.bind(app));
        $('#resize-check').bind("oTransitionEnd", app.resizeUi.bind(app));
    };

    var initGame = function() {
        require(['game'], function(Game) {
            var canvas = document.getElementById("entities"),
                background = document.getElementById("background"),
                foreground = document.getElementById("foreground"),
                input = document.getElementById("chatinput");

            game = new Game(app);
            game.setup('#bubbles', canvas, background, foreground, input);
            game.setStorage(app.storage);
            app.setGame(game);

            if (app.isDesktop && app.supportsWorkers) {
                game.loadMap();
            }

            game.onGameStart(function() {
                app.initEquipmentIcons();
            });

            game.onDisconnect(function(message) {
                $('#death').find('p').html(message + "<em>Please reload the page.</em>");
                $('#respawn').hide();
            });

            game.onPlayerDeath(function() {
                if ($('body').hasClass('credits')) {
                    $('body').removeClass('credits');
                }
                $('body').addClass('death');
            });

            game.onPlayerEquipmentChange(function() {
                app.initEquipmentIcons();
            });

            game.onPlayerInvincible(function() {
                $('#hitpoints').toggleClass('invincible');
            });

            game.onNbPlayersChange(updatePlayerCount);

            game.onAchievementUnlock(function(id, name, description) {
                app.unlockAchievement(id, name);
            });

            game.onNotification(function(message) {
                app.showMessage(message);
            });

            app.initHealthBar();

            setGameEventHandlers(game);
        });
    };

    var updatePlayerCount = function(worldPlayers, totalPlayers) {
        var setWorldPlayersString = function(string) {
            $("#instance-population").find("span:nth-child(2)").text(string);
            $("#playercount").find("span:nth-child(2)").text(string);
        },
        setTotalPlayersString = function(string) {
            $("#world-population").find("span:nth-child(2)").text(string);
        };

        $("#playercount").find("span.count").text(worldPlayers);
        $("#instance-population").find("span").text(worldPlayers);
        if (worldPlayers === 1) {
            setWorldPlayersString("player");
        } else {
            setWorldPlayersString("players");
        }

        $("#world-population").find("span").text(totalPlayers);
        if (totalPlayers === 1) {
            setTotalPlayersString("player");
        } else {
            setTotalPlayersString("players");
        }
    };

    var setGameEventHandlers = function(game) {
        $('#foreground').click(function(event) {
            app.center();
            app.setMouseCoordinates(event);
            if (game) {
                game.click();
            }
            app.hideWindows();
        });

        $('#respawn').click(function(event) {
            game.audioManager.playSound("revive");
            game.restart();
            $('body').removeClass('death');
        });

        $(document).mousemove(function(event) {
            app.setMouseCoordinates(event);
            if (game.started) {
                game.movecursor();
            }
        });

        $(document).keydown(function(e) {
            var key = e.which;
            if (key === 13) { // Enter
                if ($('#chatbox').hasClass('active')) {
                    app.hideChat();
                } else {
                    app.showChat();
                }
            }
        });

        $('#chatinput').keydown(handleChatInput);
        $('#nameinput').keypress(handleNameInput);
        $('#mutebutton').click(function() {
            game.audioManager.toggle();
        });

        $(document).bind("keydown", handleGlobalKeydown);

        if (game.renderer.tablet) {
            $('body').addClass('tablet');
        }
    };

    var handleChatInput = function(e) {
        var key = e.which,
            chat_el = $('#chatinput');

        if (key === 13) {
            if (chat_el.val().replace(/\s/g, '').length) {
                if (game.player) {
                    game.say(chat_el.val());
                }
                app.hideChat();
                $('#foreground').focus();
                return false;
            } else {
                app.hideChat();
                return false;
            }
            chat_el.val("");
        }

        if (key === 27) {
            app.hideChat();
            return false;
        }
    };

    var handleNameInput = function(event) {
        var name_el = $('#nameinput'),
            name = name_el.val();

        if (event.keyCode === 13) {
            if (name !== '') {
                app.tryStartingGame(name, function() {
                    name_el.blur(); // exit keyboard on mobile
                });
                return false; // prevent form submit
            } else {
                return false; // prevent form submit
            }
        }
    };

    var handleGlobalKeydown = function(e) {
        var key = e.which,
            $chat = $('#chatinput');

        if ($('#chatinput:focus').size() == 0 && $('#nameinput:focus').size() == 0) {
            if (key === 13) { // Enter
                if (game.ready) {
                    $chat.focus();
                    return false;
                }
            }
            if (key === 32) { // Space
                return false;
            }
            if (key === 70) { // F
                return false;
            }
            if (key === 27) { // ESC
                app.hideWindows();
                _.each(game.player.attackers, function(attacker) {
                    attacker.stop();
                });
                return false;
            }
            if (key === 65) { // a
                return false;
            }
        } else {
            if (key === 13 && game.ready) {
                $chat.focus();
                return false;
            }
        }
    };

    initApp();
});
