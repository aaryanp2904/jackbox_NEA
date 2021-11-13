var roomCodes = []

class Game {

    // This array will contain all the rooms currently available
    #rooms = []

    addRoom(room) {
        // Adds the provided room to our rooms array
        this.#rooms.push(room)
    }

    findRoom(roomCode) {
        // Iterates through the rooms array and checks if a room with the provided room code exists
        for (var i = 0; i < this.#rooms.length; i++) {
            if (this.#rooms[i].getCode() === roomCode) {
                // returns the room 
                return this.#rooms[i];
            };
        }
        return false
    }

    endRoom(roomCode) {
        // Get the room from the room code
        let room = this.findRoom(roomCode)

        // Tell every player the game has ended
        room.getPlayers().forEach(element => {
            room.getSocketByName(element.getName()).emit('game-ended')
            room.getPlayers().forEach(element => {
                // All player object can be garbage collected
                element = null
            })
        })

        // Room can be garbage collected
        room = null
    }
}

class User {
    #room
    #connected = true;
    constructor(room) {
        this.#room = room
    }

    getRoom() {
        return this.#room
    }

    hasDisconnected() {
        this.#connected = false;
    }

    hasReconnected() {
        this.#connected = true;
    }

    getConnected() {
        return this.#connected
    }
}

class Room {

    // Initialisation and key information
    #gameStarted = false;
    #code;
    #host;
    #players = []
    #aliens = []
    #originalAliens = []
    #testLimit;
    #firstPlayer = true;
    #rootPlayerSocket;

    // Task selection and handling
    #currentTask;
    #currentTaskers;
    #captainSubmitted = false;
    #numberOfResponses = 0;
    #responseDict = {};
    #humanPrompt;
    #alienPrompt;
    #currentCaptainIndex = 0;

    // Button pushed stuff
    #agree = 0;
    #disagree = 0;
    #alienSuspects;

    // Disconnect/Reconnect
    #disconnectedPlayers = [];


    // Initialisation
    constructor(hostSock) {
        // Set basic values of our room object
        this.#host = hostSock;
        this.#code = this.#generateCode(4)
    }

    getGameStarted() {
        return this.#gameStarted
    }

    setGameStarted() {
        this.#gameStarted = true
    }

    #generateCode(length) {

        // This variable will be our room code
        var result = '';

        // These are the list of characters the room code will be made from
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

        // This will be used to randomly select a character from the string above
        var charactersLength = chars.length;

        // We now iterate  'length' number of times
        for (var i = 0; i < length; i++) {
            // Concatenate a random letter from chars to result
            result += chars.charAt(Math.floor(Math.random() *
                charactersLength));
        }


        // If the room code already exists, we return a new code
        if (roomCodes.includes(result)) {
            return this.#generateCode(length)
        }

        // Otherwise we add our code to the roomCodes array and return the code
        roomCodes.push(result)
        return result;
    }

    #calculateNumAliens() {
        // Returns number of aliens given the size of the lobby
        let numPlayers = this.#players.length;
        switch (numPlayers) {
            case 5:
            case 6:
                return 2
            case 7:
            case 8:
            case 9:
            case 10:
                return 3
        }

        return 1
    }

    chooseAliens() {
        // Assigns the aliens randomly
        let numAliens = this.#calculateNumAliens()
        let i = 0
        while (i < numAliens) {
            let alien = this.getPlayers()[Math.floor(Math.random() * this.getPlayers().length)];
            // add random player to aliens list

            if (!this.#aliens.includes(alien)) {
                this.#aliens.push(alien)
                this.#originalAliens.push(alien)
                console.log(alien.getName() + ' is an alien now.')
                // sets player's role value to 1, indicating they are an alien
                alien.setAlien()
                i += 1
            }
        }

    }

    addPlayer(player, socket) {

        // Adds the provided player to the players array
        this.#players.push(player)

        // Is this the first player to join
        if (this.#firstPlayer) {

            // If it is, it'll be made the rootPlayerSocket
            this.#rootPlayerSocket = new PlayerSocket(player.getName(), socket);

            // The next players to join will not be the rootPlayerSocket
            this.#firstPlayer = false;
            return
        }
        this.#rootPlayerSocket.addPlayerSocket(player.getName(), socket)
    }

    checkNameFree(name) {
        for (let i = 0; i < this.#players.length; i++) {
            let player = this.#players[i]
            console.log('Comparing', player.getName(), 'and', name)
            if (player.getName() === name && player.getConnected()) {
                console.log('Sending message that name is already in use.')
                return 0
            }
        }
        return 1
    }



    // General getters and setters

    getHost() {
        return this.#host;
    }

    getAliens() {
        return this.#aliens
    }

    getNumAliens() {
        return this.#aliens.length
    }

    getAlienNames() {
        let alienNames = []
        this.#aliens.forEach(alien => {
            alienNames.push(alien.getName())
        })
        return alienNames
    }

    getOriginalAlienNames() {
        let namedata = []
        this.#originalAliens.forEach(alien => {
            namedata.push(alien.getName())
        })
        return namedata
    }

    getPlayers() {
        return this.#players
    }

    getNumPlayers() {
        return this.#players.length
    }

    getPlayerNames() {
        // Returns an array of all the nicknames of players within a room
        let names = []
        for (var i = 0; i < this.#players.length; i++) {
            if (this.#players[i].getConnected()) {
                names.push(this.#players[i].getName())
            }
        }
        console.log(names)
        return names

    }

    getPlayerByName(name) {
        for (var i = 0; i < this.#players.length; i++) {
            if (this.#players[i].getName() === name) {
                return this.#players[i]
            }
        }
    }

    getSocketByName(name) {
        return this.#rootPlayerSocket.getPlayerSocket(name)
    }

    getCode() {
        return this.#code;
    }


    // Tasks and Handling

    getTask() {
        return this.#currentTask
    }

    setTask(task) {
        this.#currentTask = task
    }

    getCaptainSubmitted() {
        return this.#captainSubmitted
    }

    setCaptainSubmitted() {
        this.#captainSubmitted = true
    }

    resetCaptainSubmitted() {
        this.#captainSubmitted = false
    }

    getCaptainIndex() {
        return this.#currentCaptainIndex
    }

    incrementCaptainIndex() {
        this.#currentCaptainIndex += 1
    }

    decrementCaptainIndex() {
        this.#currentCaptainIndex -= 1
    }

    getHumanPrompt() {
        return this.#humanPrompt
    }

    setHumanPrompt(data) {
        this.#humanPrompt = data
    }

    getAlienPrompt() {
        return this.#alienPrompt
    }

    setAlienPrompt(data) {
        this.#alienPrompt = data
    }

    getNumberOfResponses() {
        return this.#numberOfResponses
    }

    resetNumberOfResponses() {
        this.#numberOfResponses = 0
    }

    incrementNumberOfResponses() {
        console.log('Response received.')
        this.#numberOfResponses += 1
    }

    decrementNumberOfResponses() {
        this.#numberOfResponses -= 1
    }

    getResponseDict() {
        return this.#responseDict
    }

    addResponse(name, response) {
        // console.log(name, 'sent response:', response)
        this.#responseDict[name] = response;
    }

    resetResponseDict() {
        for (const [key, value] of Object.entries(this.#responseDict)) {
            delete this.#responseDict[key]
        }
    }

    makeCaptainOrder() {
        // Use the Durstenfeld shuffle to make a random order of players
        for (var i = this.#players.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = this.#players[i];
            this.#players[i] = this.#players[j];
            this.#players[j] = temp;
        }
    }

    getCurrentCaptainName() {
        return this.#players[(this.#currentCaptainIndex) % this.#players.length].getName()
    }

    getCurrentCaptainConnected() {
        return this.#players[(this.#currentCaptainIndex) % this.#players.length].getConnected()
    }

    getCurrentTaskers() {
        return this.#currentTaskers
    }

    setCurrentTaskers(data) {
        this.#currentTaskers = data
    }

    resetCurrentTaskers() {
        this.#currentTaskers = []
    }

    getTestLimit() {
        this.#testLimit = this.#testLimitCalculator(this.#players.length)
        return this.#testLimit;
    }

    #testLimitCalculator(data) {
        switch (data) {
            case 5:
            case 6:
                return 2
            case 7:
            case 8:
            case 9:
            case 10:
                return 3
        }

        return 1
    }


    // Alien Button functions

    getAgree() {
        return this.#agree
    }


    incrementAgree() {
        this.#agree += 1
    }

    getDisagree() {
        return this.#disagree
    }

    incrementDisagree() {
        this.#disagree += 1
    }

    resetAgreements() {
        this.#agree = 0
        this.#disagree = 0
    }

    getAlienSuspects() {
        return this.#alienSuspects
    }

    setAlienSuspects(data) {
        this.#alienSuspects = data;
    }

    resetAlienSuspects() {
        this.#alienSuspects.splice(0, this.#alienSuspects.length)
    }

    removeAlienSuspectsFromGame() {
        console.log('Players in the game are:', this.getPlayerNames())
        console.log('Aliens in the game are:', this.getAlienNames())

        console.log('Alien suspects are: ', this.#alienSuspects)

        // Iterate through every alien suspect
        this.#alienSuspects.forEach(alien => {
            var index = this.#players.indexOf(this.getPlayerByName(alien));
            var alienIndex = this.#aliens.indexOf(this.getPlayerByName(alien));
            if (index !== -1) {
                // Tell the player they have been kicked
                this.getSocketByName(alien).emit('player-kicked')

                // Remove them from the player list
                this.#players.splice(index, 1);
            }

            if (alienIndex !== -1) {

                // Remove them from the alien list if they are an alien
                this.#aliens.splice(alienIndex, 1)
            }
        })

        console.log('Players still in the game are:', this.getPlayerNames())
        console.log('Aliens still in the game are:', this.getAlienNames())

        let aliensWon = false
        let humansWon = false

        // If there are no aliens left in the game then humans won
        if (this.#aliens.length === 0) {
            humansWon = 1
        }

        // If there are more aliens than humans then aliens won
        if (this.#aliens.length >= this.#players.length - this.#aliens.length) {
            aliensWon = 1
        }

        // Tell the host if either of the teams won
        if (aliensWon) {
            this.getHost().emit('aliens-won', this.getOriginalAlienNames())
        }

        else if (humansWon) {
            this.getHost().emit('humans-won', this.getOriginalAlienNames())
        }

    }

    // Connection Handling
    removePlayer(player) {
        let i = this.#players.indexOf(player)
        this.#players.splice(i, 1)
    }

    disconnectPlayerFromRoom(playerToRemove) {
        // Add the player to the disconnected players list
        this.#disconnectedPlayers.push(playerToRemove)

        // // Iterate through every player
        // for (let i = 0; i < this.#players.length; i++) {

        //     // Remove the player if they are in the players list
        //     let player = this.#players[i]
        //     if (player === playerToRemove) {
        //         player.hasDisconnected()
        //     }
        // }

        playerToRemove.hasDisconnected()

        let ind = this.#aliens.indexOf(playerToRemove)
        if (ind > 0) {this.#aliens.splice(ind, 1)}

        // Iterate through every alien
        // for (let i = 0; i < this.#aliens.length; i++) {

        //     // Remove the player if they are in the aliens list
        //     let player = this.#aliens[i]
        //     if (player === playerToRemove) {
        //         this.#aliens.splice(i, 1)
        //     }
        // }
    }

    checkPlayerDisconnected(name) {
        // Iterate through disconnectedPLayers list
        for (var i = 0; i < this.#disconnectedPlayers.length; i++) {
            let player = this.#disconnectedPlayers[i]

            // See if any disconnected player's name matches the one given
            if (player.getName() === name) {

                // Remove it from the disconnectedPlayers list
                this.#disconnectedPlayers.splice(i, 1);

                // Set connected status to true
                player.hasReconnected()

                // If the player is an alien then put them back in aliens list
                if (player.getAlien()) {
                    this.#aliens.push(player)
                }
                return player
            }
        }
    }

    changePlayerSocket(name, socket) {
        this.#rootPlayerSocket.changePlayerSocket(name, socket)
    }

}


class Player extends User {

    #nickname;
    // 0 means the player is a human and 1 means players is an alien
    #alien = 0;

    constructor(nickname, room) {
        super(room);
        this.#nickname = nickname;
    }

    getName() {
        return this.#nickname
    }

    getAlien() {
        return this.#alien
    }

    setAlien() {
        // sets player's role value to 1, indicating they are an alien
        this.#alien = 1;
    }

}

class Host extends User {

    constructor(room) {
        super(room)
    }
}

class PlayerSocket {
    #playerName;
    #socket;
    #leftNode;
    #rightNode;

    constructor(name, socket) {
        this.#playerName = name;
        this.#socket = socket;
    }

    addPlayerSocket(name, socket) {

        // Is the name alphabetically higher than the current node's
        if (name > this.#playerName) {
            // Does this node have a right node
            if (this.#rightNode) {
                // Call the addPlayerSocket() function on this right node
                this.#rightNode.addPlayerSocket(name, socket);
                return
            }
            // The new PlayerSocket node will be added as a child here
            else {
                this.#rightNode = new PlayerSocket(name, socket);
                return
            }
        }

        // This means the name is alphabetically lower
        else {
            // Does this node have a left node
            if (this.#leftNode) {
                // Call the addPlayerSocket() function on this left node
                this.#leftNode.addPlayerSocket(name, socket);
                return
            }
            // The new PlayerSocket node will be added as a child here
            else {
                this.#leftNode = new PlayerSocket(name, socket);
                return
            }
        }
    }

    getPlayerSocket(name) {
        // Is the name provided the same as this node's name
        if (name === this.#playerName) {
            //Then return this node's socket
            return this.#socket
        }

        // Is the name alphabetically higher than this node's name
        if (name > this.#playerName) {
            // Then tell the right node to find the correct node
            return this.#rightNode.getPlayerSocket(name)
        }

        // Otherwise tell the left node to find the correct node
        return this.#leftNode.getPlayerSocket(name)
    }

    changePlayerSocket(name, socket) {
        console.log('Comparing ', name, 'to', this.#playerName)
        console.log(this.#playerName, 'has id: ', this.#socket.id)

        // If this node has the name of the player whose PlayerSocket we wish to change...
        if (name === this.#playerName) {

            // Reassign the socket
            this.#socket = socket
            console.log(this.#playerName, ' now has id: ', this.#socket.id)
            return
        }

        // If the name is alphabetically higher than this node's name...
        if (name > this.#playerName) {
            // Call this method on the right node
            this.#rightNode.changePlayerSocket(name, socket)
            return
        }

        // If the name is alphabetically lower than this node's name
        // then call this method on the right node 
        this.#leftNode.changePlayerSocket(name, socket)
        return
    }
}



module.exports.Game = Game;
module.exports.Room = Room;
module.exports.Player = Player;
module.exports.Host = Host;