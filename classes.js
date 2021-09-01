class Game {
    #rooms = []

    addRoom(){
        this.#rooms.push(room)
    }

    findRoom(roomCode){
        for (var i = 0; i < this.#rooms.length; i++) {
            if (this.#rooms[i].getCode() === roomCode){
                return this.#rooms[i];
            };
        }
        return false
    }
}

class Room{

    #code = this.#makeid(4);
    #host;
    #players = []
    #aliens = []

    constructor(hostSock){
        // Set basic values of our room object
        // this.#code = this.#makeid(4);
        this.#host = hostSock;
        // this.#players = []
        // this.#aliens = []
    }

    #makeid(length) {
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
          result += characters.charAt(Math.floor(Math.random() * 
     charactersLength));
       }
       return result;
    }

    #chooseNumAliens(){
        // Returns number of aliens given the size of the lobby
        numPlayers = this.#players.length;
        switch (numPlayers){
            case 5:
            case 6:
                return 2
            case 7:
            case 8:
            case 9:
            case 10:
                return 3
        }
    }

    chooseAliens(){
        // Assigns the aliens randomly
        numAliens = this.#chooseNumAliens()
        for (let i=0; i<numAliens; i++){
            const alien = array[Math.floor(Math.random() * array.length)];
            // add random player to aliens list
            this.aliens.push(alien)
            // sets player's role value to 1, indicating they are an alien
            alien.setAlien()
        }
    }

    getCode(){
        return this.#code;
    }

    addPlayer(player){
        this.#players.push(player)
    }

    getPlayers(){
        return this.#players
    }

    getPlayerNames(){
        let names = []
        for ( var i = 0; i < this.#players.length; i++ ) {
            names.push(this.#players[i].nickname)
        }
        return names

    }

    getHost(){
        return this.#host;
    }

    makeCaptainOrder(){
        /* Use the Durstenfeld shuffle*/
        for (var i = this.#players.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = this.#players[i];
            this.#players[i] = this.#players[j];
            this.#players[j] = temp;
        }
    }
}


// A socket is pretty much a player
class Player{

    #name;
    #room;
    #sock;
    // 0 means the player is a human and 1 means players is an alien
    #role = 0;

    constructor(nickname, roomCode, sock){
        this.#name = nickname;
        this.#room = roomCode;
        this.#sock = sock;
        // // 0 means the player is a human and 1 means players is an alien
        // this.#role = 0;
    }
        
    getName(){
        return this.#name
    }

    getRoom(){
        return this.#room
    }

    setAlien(){
         // sets player's role value to 1, indicating they are an alien
        this.#role = 1;
    }

    getSock(){
        return this.#sock;
    }
}

module.exports.Game = Game;
module.exports.Room = Room;
module.exports.Player = Player;