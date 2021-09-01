let screen = document.getElementById('game-area')
let nameList = document.getElementById('names')
let createGamebtn = document.getElementById('create')

createGamebtn.addEventListener('click', function() {
    socket.emit('create-room')
})

socket.on('room-details-code', data => {
    sessionStorage.setItem('room-code', data)
    screen.textContent = "The room code is: " + sessionStorage.getItem('room-code')
})

socket.on('player-list', data => {
    nameList.textContent = data
})