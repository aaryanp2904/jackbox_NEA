const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require("socket.io");
const io = new Server(server);
var classes = require("./classes2");

let ind;

const writingPrompts = [{
    'human': 'What is your most prized possession?',
    'alien': 'What is the best birthday gift you have received?'
},
    {'human': 'What is your favourite type of food?', 'alien': 'What food did you hate at first but now actually like'},
    {
        'human': 'What is the best book you have ever read?',
        'alien': 'What book do you really want to read but haven\'t got round to reading yet?'
    },
    {
        'human': 'Which person in this game do you think is most likely to lock themselves out of the house?',
        'alien': 'Which person is here is the most lost/forgetful?'
    }]

const drawingPrompts = [{'human': 'Draw a hospital.', 'alien': 'Draw a pharmacy'},
    {'human': 'Draw a goat', 'alien': 'Draw a horse.'},
    {'human': 'Don\'t draw anything', 'alien': 'Draw emptiness.'},
    {'human': 'Draw the captain.', 'alien': 'Draw yourself.'}]

const triviaPrompts = [{
    'human': 'What was Einstein\'s first name?',
    'alien': 'What was the first name of Queen Victoria\'s consort?'
}, {
    'human': 'What is the capital of France?',
    'alien': 'Which city\'s team does Keylor Navas play for?'
}, {
    'human': 'Which country had George Washington as their President?',
    'alien': 'Which country is the largest corn manufacturer of the world?'
}, {
    'human': 'What is the largest country by land mass?',
    'alien': 'What country was the initial pioneer of the periodic table from?'
}, {
    'human': 'What gas do humans need to breathe to survive?',
    'alien': 'What is the element that makes the triatomic molecule ozone?'
},

    {'human':'In which country is the stature of Jesus Christ, called Christ the Redeemer, located?',
    'alien': 'Which country\'s dialing code is +55?'}]

const tierPrompts = [{'id': '1','human': 'best club to worst (in terms of how good they are)','alien': 'favourite club to least favourite.'},{'id': '2', 'human': 'funniest movie to most dull.', 'alien': 'best movie to worst.'}]

const tierCards = [{'tier_prompt_id': '1', 'name': 'Chelsea'},
    {'tier_prompt_id': '1','name': 'Liverpool'},
    {'tier_prompt_id': '1', 'name': 'Bayern Munich'},
    {'tier_prompt_id': '1', 'name': 'Arsenal'},
    {'tier_prompt_id': '1','name': 'Tottenham'},
    {'tier_prompt_id': '1', 'name': 'Aston Villa'},
    {'tier_prompt_id': '1','name': 'Borussia Dortmund'},
    {'tier_prompt_id': '1', 'name': 'Crystal Palace'},
    {'tier_prompt_id': '1', 'name': 'PSG'},
    {'tier_prompt_id': '1','name': 'Barcelona'},
    {'tier_prompt_id': '1', 'name': 'Real Madrid'},
    {'tier_prompt_id': '1','name': 'Manchester United'},
    {'tier_prompt_id': '1', 'name': 'Manchester City'},
    {'tier_prompt_id': '1', 'name': 'West Ham'},
    {'tier_prompt_id': '2', 'name': 'Central Intelligence'},
    {'tier_prompt_id': '2','name': 'Elf'},
    {'tier_prompt_id': '2', 'name': 'Jumanji'},
    {'tier_prompt_id': '2', 'name': 'Daddy\'s Home'},
    {'tier_prompt_id': '2', 'name': 'Deadpool' },
    {'The Hitman': 's Bodyguard', 'tier_prompt_id': '2'},
    {'name': 'Men In Black', 'tier_prompt_id': '2'},
    {'name': 'Rush Hour', 'tier_prompt_id': '2'},
    {'name': 'Ride Along', 'tier_prompt_id': '2'}]


app.use(express.static(__dirname + '/public'));

// Instantiate a whole new game, this just helps keep track of rooms
game = new classes.Game();


// When the url is 127.0.0.1:3000/ then we get the index file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index2.html');
});

// redundant for now
app.get('/lobby', (req, res) => {
    res.sendFile(__dirname + '/lobby.html');
});

// sends host file when url is 127.0.0.1:3000/host
app.get('/host', (req, res) => {
    res.sendFile(__dirname + '/host2.html');
});


io.on('connection', (socket) => {

    console.log('a user connected');

    socket.emit('conf')

    // Room Creation and Joining
    socket.on('create-room', data => {
        // Create new room object which takes host socket as parameter
        room = new classes.Room(socket);

        // Add that room to our large game object and then output to server console what the code of this new room is
        game.addRoom(room);

        // Create new host object 
        socket.host = new classes.Host(room);
        console.log('Room Instantiated. Host id: ' + socket.id + ' || Code: ' + room.getCode())

        // We send this code to the host so that they can screenshare
        socket.emit('room-details-code', room.getCode())
    })

    socket.on('client-details', data => {
        // The nickname and room code of the client is sent as an array and so we create separate constants and assign them the corresponding array item.
        const room_code = data[0];
        const nickname = data[1];

        // We try to find if there is a room that exists with the room code provided by the client
        roomToJoin = game.findRoom(room_code);

        // If there exists a room with such a code
        if (roomToJoin) {

            // If the nickname is free to use
            if (roomToJoin.checkNameFree(nickname) == 1) {

                // Check if a player with such a nickname had disconnected previously
                let disconnectedCheck = roomToJoin.checkPlayerDisconnected(nickname)

                // If the player had disconnected before
                if (disconnectedCheck) {

                    // If such a player had disconnected, the new socket is assigned that old player object that had disconnected
                    socket.player = disconnectedCheck

                    // We now reassign the player socket in our graph
                    roomToJoin.changePlayerSocket(nickname, socket)

                    // Make that socket join the socketio room
                    socket.join(room_code)

                    // Tell the player their role
                    socket.emit('joining-response', true)
                    socket.emit('role', socket.player.getAlien())

                    // Update player list on host screen
                    roomToJoin.getHost().emit('player-list', roomToJoin.getPlayerNames())

                    // Tell player who the new captain is
                    socket.emit('choosing', socket.player.getRoom().getCurrentCaptainName())

                    // If the player was supposed to be doing a task
                    if (socket.player.getRoom().getCurrentTaskers().includes(socket.player.getName())) {

                        // If the player is an alien send them an alien prompt
                        if (socket.player.getAlien()) {
                            socket.emit(socket.player.getRoom().getTask(), socket.player.getRoom().getAlienPrompt())
                        }

                        // If the player is a human send them a human prompt
                        else {
                            socket.emit(socket.player.getRoom().getTask(), socket.player.getRoom().getHumanPrompt())
                        }

                        // When they had disconnected, we had incremented the response in case they don't reconnect
                        // Now we decrement it.
                        socket.player.getRoom().decrementNumberOfResponses()
                    }


                    console.log(`The captain name when ${socket.player.getName()} joined is ${socket.player.getRoom().getCurrentCaptainName()}`)

                }

                // If the game hasn't started yet
                else if (!roomToJoin.getGameStarted()) {

                    console.log('Player name', nickname, 'was allowed to join room code', room_code)

                    // If there is a room with that code then we just make the socket join that room
                    socket.join(room_code)

                    // Inform the client that their joining attempt has been successful
                    socket.emit('joining-response', true)

                    // Add the player's socket to our room's players list and then inform the host of the new updated list of players in their room
                    socket.player = new classes.Player(nickname, roomToJoin);

                    // Add the player oibject to our room object
                    roomToJoin.addPlayer(socket.player, socket)

                    // Update the player list on the host screen
                    roomToJoin.getHost().emit('player-list', roomToJoin.getPlayerNames())

                }

                // If the game has already started
                else {
                    socket.emit('game-already-started')
                }
            }

            // If the nickname isn't free to use
            else {
                // Tell the player they can't use the nickname
                socket.emit('name-already-in-use')
            }
        }

        // If there is no room with the provided code
        else {
            // We inform client that their joining attempt has been unsuccessful.
            socket.emit('joining-response', false)
        }


    })

    socket.on('game-ready', data => {
        // Output the host and code of the room that is ready to start a game
        console.log('Game with host ' + socket.id + ' and code ' + socket.host.getRoom().getCode() + ' is ready.')

        // Set the game started value to true
        socket.host.getRoom().setGameStarted()

        // make a random order for the players. This decides who is captain when. We have used the Durstenfeld shuffle.
        socket.host.getRoom().makeCaptainOrder()

        // Randomly choose some players as aliens
        socket.host.getRoom().chooseAliens()


        // Tell each player their respective role
        socket.host.getRoom().getPlayers().forEach(element => {
            console.log('Sending data to ', element.getName())
            socket.host.getRoom().getSocketByName(element.getName()).emit('role', element.getAlien())
        });

        // We emit to the whole game room and host a message named 'choosing' which contains the nickname of the current captain
        socket.to(socket.host.getRoom().getCode()).emit('choosing', socket.host.getRoom().getPlayers()[0].getName())
        socket.host.getRoom().getHost().emit('choosing', socket.host.getRoom().getPlayers()[0].getName())

        // Tell the first one on the list that it is their turn
        // Add the testing limit to the end of the array
        playerNamesAndLimit = socket.host.getRoom().getPlayerNames()
        playerNamesAndLimit.push(socket.host.getRoom().getTestLimit())
        console.log('Test limit is: ', socket.host.getRoom().getTestLimit())

        // Get rid of the captain's own name as they shouldn't be allowed to test themselves
        for (var i = 0; i < playerNamesAndLimit.length; i++) {

            if (playerNamesAndLimit[i] === socket.host.getRoom().getPlayers()[0].getName()) {
                playerNamesAndLimit.splice(i, 1);
                i--;
            }
        }

        // Send first person in captain order a you turn message
        socket.host.getRoom().getSocketByName(socket.host.getRoom().getPlayers()[0].getName()).emit('your-turn', playerNamesAndLimit)

        // Confirm to the host that the server and host have started the game
        socket.emit('game-started')
    })


    // Tasks and task response handling
    socket.on('writing', data => {

        ind = Math.floor(Math.random() * writingPrompts.length);
        prompts = writingPrompts[ind]
        console.log("The prompts are:", prompts)

        // Set current taskers and set captain submitted to true
        socket.player.getRoom().setCurrentTaskers(data)
        socket.player.getRoom().setCaptainSubmitted()

        // Set the room's task to writing
        socket.player.getRoom().setTask('writing')

        // Reset the responses so that we can store the new writing responses
        socket.player.getRoom().resetNumberOfResponses()

        // Tell the host we are doing a writing task and send them a list [captain name, players chosen]
        socket.player.getRoom().getHost().emit('writing', [socket.player.getName(), data])

        // Respective prompts
        let human_prompt = prompts['human']
        let alien_prompt = prompts['alien']

        console.log("writing option chosen. Players chosen: ", data)

        // Store the human prompt to the room object
        socket.player.getRoom().setHumanPrompt(human_prompt)

        // Store the alien prompt
        socket.player.getRoom().setAlienPrompt(alien_prompt)

        for (var i = 0; i < data.length; i++) {

            // We get the socket of each player to be probed
            playerSocket = socket.player.getRoom().getSocketByName(data[i])

            // Depending on whether they are human or alien, we give them the human or alien task
            if (playerSocket.player.getAlien() === 1) {
                playerSocket.emit('writing', alien_prompt)
            } else {
                playerSocket.emit('writing', human_prompt)
            }
        }


    })

    socket.on('tier', data => {
        // Query for tier list prompts
        ind = Math.floor(Math.random() * tierPrompts.length);
        prompts = tierPrompts[ind]
        console.log("The prompts are:", prompts)

        // Filter out the human and alien prompts
        human_prompt = prompts['human']
        alien_prompt = prompts['alien']

        array = []

        tierCards.forEach(element => {
            if (element['tier_prompt_id'] === prompts['id']) {
                array.push(element)
            }
        })

        // Query the database for all the tier-list cards relevant to the prompt
// Shuffle array
        const shuffled = array.sort(() => 0.5 - Math.random());

// Get sub-array of first n elements after shuffled
        let cards = shuffled.slice(0, 8);

        // Filter out human and alien prompts and put them into separate arrays
        // One will be sent to humans the other to aliens
        let cardsForHumans = [human_prompt]
        let cardsForAliens = [alien_prompt]

        // Append the cards to the arrays
        cards.forEach(element => {
            cardsForHumans.push(element['name'])
            cardsForAliens.push(element['name'])
        })

        // Set current taskers and set captain submitted to true
        socket.player.getRoom().setCurrentTaskers(data)
        socket.player.getRoom().setCaptainSubmitted()

        // Set the room's task to tier
        socket.player.getRoom().setTask('tier')

        // Reset the responses so that we can store the new tier responses
        socket.player.getRoom().resetNumberOfResponses()

        // Tell the host we are doing a tier task and send them a list [captain name, players chosen]
        socket.player.getRoom().getHost().emit('tier', [socket.player.getName(), data])

        console.log("Tier option chosen. Players chosen: ", data)

        // Store the human prompt to the room object
        socket.player.getRoom().setHumanPrompt(cardsForHumans)

        // Store the alien prompt to the room object
        socket.player.getRoom().setAlienPrompt(cardsForAliens)

        for (var i = 0; i < data.length; i++) {

            // We get the socket of each player to be probed
            playerSocket = socket.player.getRoom().getSocketByName(data[i])

            // Depending on whether they are human or alien, we give them the human or alien task
            if (playerSocket.player.getAlien() === 1) {
                playerSocket.emit('tier', cardsForAliens)
            } else {
                playerSocket.emit('tier', cardsForHumans)
            }
        }
    })

    socket.on('trivia', data => {

        // Query the database for all the tier-list cards relevant to the prompt
// Shuffle array
        const shuffled = triviaPrompts.sort(() => 0.5 - Math.random());

// Get sub-array of first n elements after shuffled
        prompts = shuffled.slice(0, 20);

        alien_prompts = []
        human_prompts = []

        // Add respective trivia prompst
        prompts.forEach(element => {
            alien_prompts.push(element['alien'])
            human_prompts.push(element['human'])
        })

        // Set current taskers and set captain submitted to true
        socket.player.getRoom().setCurrentTaskers(data)
        socket.player.getRoom().setCaptainSubmitted()


        // Set the room's task to trivia
        socket.player.getRoom().setTask('trivia')

        // Reset responses so that we can store new trivia responses
        socket.player.getRoom().resetNumberOfResponses()

        // Tell the host we are doing a trivia task and send them a list [captain name, players chosen]
        socket.player.getRoom().getHost().emit('trivia', [socket.player.getName(), data])


        // Store the human prompt to the room object
        socket.player.getRoom().setHumanPrompt(human_prompts)
        socket.player.getRoom().setAlienPrompt(alien_prompts)

        console.log("Trivia option chosen. Players chosen: ", data)

        for (var i = 0; i < data.length; i++) {

            // We get the socket of each player to be probed
            playerSocket = socket.player.getRoom().getSocketByName(data[i])

            // Depending on whether they are human or alien, we give them the human or alien task
            if (playerSocket.player.getAlien() === 1) {
                playerSocket.emit('trivia', alien_prompts)
            } else {
                playerSocket.emit('trivia', human_prompts)
            }
        }

    })

    socket.on('drawing', data => {
        ind = Math.floor(Math.random() * drawingPrompts.length);
        prompts = drawingPrompts[ind]

        // Set current taskers and set captain submitted to true
        socket.player.getRoom().setCurrentTaskers(data)
        socket.player.getRoom().setCaptainSubmitted()

        // Set the room's task to drawing
        socket.player.getRoom().setTask('drawing')

        // Reset responses so that we can store new trivia responses
        socket.player.getRoom().resetNumberOfResponses()

        // Tell the host we are doing a drawing task and send them a list [captain name, players chosen]
        socket.player.getRoom().getHost().emit('drawing', [socket.player.getName(), data])


        console.log("Drawing option chosen. Players chosen: ", data)

        // Filter out respective prompts
        human_prompt = prompts['human']
        alien_prompt = prompts['alien']

        // Store the human prompt to the room object
        socket.player.getRoom().setHumanPrompt(human_prompt)
        socket.player.getRoom().setAlienPrompt(alien_prompt)

        for (var i = 0; i < data.length; i++) {

            // We get the socket of each player to be probed
            playerSocket = socket.player.getRoom().getSocketByName(data[i])

            // Depending on whether they are human or alien, we give them the human or alien task
            if (playerSocket.player.getAlien() === 1) {
                playerSocket.emit('drawing', alien_prompt)
            } else {
                playerSocket.emit('drawing', human_prompt)
            }
        }
    })

    socket.on('task-response', data => {

        // Add 1 to the counter representing task responses and display it in the console
        socket.player.getRoom().incrementNumberOfResponses()
        console.log(data)

        // We add this response to the dictionary containing all responses for the room object
        socket.player.getRoom().addResponse(socket.player.getName(), data)

        // Check if the number of responses is equal to the number of people who should have been probed. We
        // are essentially checking if everynoe has done the task.
        if (socket.player.getRoom().getNumberOfResponses() === socket.player.getRoom().getCurrentTaskers().length) {

            // Create a list containing the prompt as the first item and the dictionary containing the responses
            // and their corresponding players as the second item
            let sendingData = [socket.player.getRoom().getHumanPrompt(), socket.player.getRoom().getResponseDict()]
            socket.player.getRoom().resetCurrentTaskers()
            console.log('Sending: ' + sendingData)

            // Send the list above to the host with a message name corresponding to the task that the players did
            // in the format `responses-{taskName}`
            socket.player.getRoom().getHost().emit('responses-' + socket.player.getRoom().getTask(), sendingData)

            // We iterate through every player in the room and inform them that the task has been finished.
            // This is essential to enable the Alien Button
            if (Object.keys(socket.player.getRoom().getResponseDict()).length > 0) {
                io.in(socket.player.getRoom().getCode()).emit('task-finished')
            }

        }
    })

    socket.on('disconnected-tasker-response', function () {

        // Add 1 to the counter representing task responses and display it in the console
        socket.host.getRoom().incrementNumberOfResponses()

        // Check if the number of responses is equal to the number of people who should have been probed. We
        // are essentially checking if everynoe has done the task.
        if (socket.host.getRoom().getNumberOfResponses() === socket.host.getRoom().getCurrentTaskers().length) {

            // Create a list containing the prompt as the first item and the dictionary containing the responses
            // and their corresponding players as the second item
            let sendingData = [socket.host.getRoom().getHumanPrompt(), socket.host.getRoom().getResponseDict()]
            socket.host.getRoom().resetCurrentTaskers()
            console.log('Sending: ' + sendingData)

            // Send the list above to the host with a message name corresponding to the task that the players did
            // in the format `responses-{taskName}`
            socket.emit('responses-' + socket.host.getRoom().getTask(), sendingData)

            // We iterate through every player in the room and inform them that the task has been finished.
            // This is essential to enable the Alien Button
            if (Object.keys(socket.host.getRoom().getResponseDict()).length > 0) {
                io.in(socket.host.getRoom().getCode()).emit('task-finished')
            }
        }

    })

    socket.on('finished-viewing', data => {

        // Keep incrementing captain index until you find a connected captain
        let connectedCaptain = false
        while (!connectedCaptain) {
            socket.host.getRoom().incrementCaptainIndex()
            if (socket.host.getRoom().getCurrentCaptainConnected()) {
                connectedCaptain = true;
            }
        }

        // Reset task related values
        socket.host.getRoom().resetCaptainSubmitted()
        socket.host.getRoom().resetCurrentTaskers()
        socket.host.getRoom().resetResponseDict()
        socket.host.getRoom().resetNumberOfResponses()

        // Make a list called playerNamesAndLimit list which contains all the names of the players in the lobby along with the 
        // limit of players that can be probed at a single time.
        playerNamesAndLimit = socket.host.getRoom().getPlayerNames()
        playerNamesAndLimit.push(socket.host.getRoom().getTestLimit())
        console.log('Test limit is: ', socket.host.getRoom().getTestLimit())

        // Iterate through all the players
        for (var i = 0; i < playerNamesAndLimit.length; i++) {

            // Get rid of the captain's own name as they shouldn't be allowed to test themselves
            if (playerNamesAndLimit[i] === socket.host.getRoom().getCurrentCaptainName()) {
                playerNamesAndLimit.splice(i, 1);
                i--;
            }
        }


        console.log(`Telling ${socket.host.getRoom().getCurrentCaptainName()} with id ${socket.host.getRoom().getSocketByName(socket.host.getRoom().getCurrentCaptainName()).id} they are captain`)

        // Tell the host and the rest of the room who is currently choosing the option
        socket.to(socket.host.getRoom().getCode()).emit('choosing', socket.host.getRoom().getCurrentCaptainName())
        socket.host.getRoom().getHost().emit('choosing', socket.host.getRoom().getCurrentCaptainName())

        // Tell the next person in the captain order that it is their turn, send them the playerNamesAndLimit array along with that
        socket.host.getRoom().getSocketByName(socket.host.getRoom().getCurrentCaptainName()).emit('your-turn', playerNamesAndLimit)

    })


    // Button Pushed functions
    socket.on('button-pushed', data => {

        // Get all the player names and append the number of aliens to the end. This is so that there
        // can be a limit to the number of people the person who pushed the button can speculate
        // to be an alien.
        playerNamesAndLimit = socket.player.getRoom().getPlayerNames()
        playerNamesAndLimit.push(socket.player.getRoom().getNumAliens())

        // like before, we iterate through and remove the captain's own name
        for (var i = 0; i < playerNamesAndLimit.length; i++) {

            if (playerNamesAndLimit[i] === socket.player.getName()) {
                playerNamesAndLimit.splice(i, 1);
                i--;
            }
        }

        // We emit the list created above to the person who pushed the button
        socket.emit('choose-aliens', playerNamesAndLimit)

        // We inform the host that button has been pushed along with who pushed it
        socket.player.getRoom().getHost().emit('button-pushed', socket.player.getName())

        // We inform all the players the button has been pushed. This is to disable the alien button for them.
        // This prevents multiple people from clicking the button to prevent others from speculating.
        socket.player.getRoom().getPlayers().forEach(player => {
            socket.player.getRoom().getSocketByName(player.getName()).emit('button-pushed')
        })


    })

    socket.on('aliens-chosen', data => {

        // We are essentially duplicating the list here as we would like to alter the original later but store
        // a copy of the current data in it as a property for the room object
        alienSuspects = data.slice()

        // Set the alien suspects in the room
        socket.player.getRoom().setAlienSuspects(alienSuspects)

        // Add the name of the person who chose the aliens to the end of the array
        data.push(socket.player.getName())

        // Send this to the host who will receive the aliens chosen and the person who chose them
        socket.player.getRoom().getHost().emit('aliens-chosen', data)

        // Send each player in the room an `agree-or-disagree` message so that they can vote
        // whether they would like to kick the players or not
        socket.player.getRoom().getPlayerNames().forEach(p => {
            if (p != socket.player.getName() && !socket.player.getRoom().getAlienSuspects().includes(p)) {
                socket.player.getRoom().getSocketByName(p).emit('agree-or-disagree')
            }
        })
    })

    socket.on('agree-or-disagree', data => {

        // A 1 is sent if the player agrees, if so we increment the agree counter
        if (data === 1) {
            socket.player.getRoom().incrementAgree()
        }

        // Otherwise a 0 must have been sent and hence we increment the disagree counter
        else {
            socket.player.getRoom().incrementDisagree()
        }

        console.log(socket.player.getRoom().getAgree() + socket.player.getRoom().getDisagree(), ' out of ', socket.player.getRoom().getNumPlayers() - 1 - socket.player.getRoom().getAlienSuspects().length, 'players have responded.')

        // If all the players to respond have responded then...
        if (socket.player.getRoom().getAgree() + socket.player.getRoom().getDisagree() === socket.player.getRoom().getNumPlayers() - 1 - socket.player.getRoom().getAlienSuspects().length) {

            // If the room has voted agree / voted to kick the players out
            if (socket.player.getRoom().getAgree() > socket.player.getRoom().getDisagree()) {

                // We remove the players from the room
                socket.player.getRoom().removeAlienSuspectsFromGame()

                // We tell the host that the room has voted to kick them out. We also send the names of the people to be kicked out and the number of aliens
                // that are still in the game even after kicking the suspects.
                socket.player.getRoom().getHost().emit('agree-or-disagree', ['agree', socket.player.getRoom().getAlienSuspects(), socket.player.getRoom().getNumAliens()])

                // Update the list of players in the lobby
                socket.player.getRoom().getHost().emit('player-list', socket.player.getRoom().getPlayerNames())
            }

            // If the room agrerd to NOT kick the players out, we send this information to the host
            else {
                socket.player.getRoom().getHost().emit('agree-or-disagree', ['disagree'])
            }

            // Reset all the properties set by the socket.on('button-pushed') function
            socket.player.getRoom().resetAgreements()
            socket.player.getRoom().resetAlienSuspects()
        }
    })

    // Alien Chat functions
    socket.on('send-alien-chat-message', data => {

        // Iterate through every alien in the room
        socket.player.getRoom().getAliens().forEach(alien => {

            // If the alien isn't the alien who sent the message himself
            if (socket.player.getRoom().getSocketByName(alien.getName()).id != socket.id) {
                console.log(`Sending ${socket.player.getName()}'s' alien message.`)

                // Send the message to the alien
                socket.player.getRoom().getSocketByName(alien.getName()).emit('receive-alien-chat-message', [socket.player.getName(), data])
            }
        })
    })


    // Endgame functions

    socket.on('game-ended', data => {
        game.endRoom(socket.host.getRoom().getCode())
    })

    socket.on('disconnect', data => {

        // I have put this in a try block because if I turn off the server and turn it back on, the program will crash as
        // the sockets connected from the previous session no longer have the player objects assigned to them because the
        // server was turned off and the player objects were stored in memory.
        try {

            // Has the game/room already started?
            if (socket.player.getRoom().getGameStarted()) {

                console.log(`${socket.player.getName()} disconnected. The captain when they disconnected was: ${socket.player.getRoom().getCurrentCaptainName()}`)


                // Check if the player who disconnected is the current captain and check they haven't already submitted a task to do along with people to do it
                if (socket.player.getName() === socket.player.getRoom().getCurrentCaptainName() && !socket.player.getRoom().getCaptainSubmitted()) {

                    console.log(`${socket.player.getName()} was a captain when they disconnected.`)

                    // Tell the host the captain disconnected
                    socket.player.getRoom().getHost().emit('captain-disconnected')

                    // Tell every player in the lobby that the current captain disconnected and so make them clear everything
                    socket.broadcast.to(socket.player.getRoom().getCode()).emit('clear-everything');
                }

                // Otherwise check if the player was a current tasker
                else if (socket.player.getRoom().getCurrentTaskers().includes(socket.player.getName())) {

                    // Let the host know 
                    socket.player.getRoom().getHost().emit('tasker-disconnected', socket.player.getName())
                }

                // Remove that player from the game
                socket.player.getRoom().disconnectPlayerFromRoom(socket.player)

                // Update the host's player list
                socket.player.getRoom().getHost().emit('player-list', roomToJoin.getPlayerNames())

            }

            // If the game hasn't started yet
            else {
                // We don't need to put them in a disconnected player list as the game hasn't started so we call the removeplayer()
                // function rather than the disconnectPlayerFromRoom() function.
                socket.player.getRoom().removePlayer(socket.player)

                // Update the host player list
                socket.player.getRoom().getHost().emit('player-list', roomToJoin.getPlayerNames())
            }
        } catch (err) {
            console.log('A previous session\'s user disconnected')
            console.log(err)

            // If it's a host who disconnected, end the game
            if (socket.host) {
                game.endRoom(socket.host.getRoom().getCode())
            }
        }
    })
})


server.listen(3000, () => {
    console.log('listening on *:3000');
});