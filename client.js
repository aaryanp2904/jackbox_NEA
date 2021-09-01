var socket = io()
var list = document.getElementById('names')
socket.on('conf', function(){
    socket.emit('details', [sessionStorage.getItem('room-code'), sessionStorage.getItem('nickname')])
})

socket.on('room_members', data => {
    list.innerHTML = ""
    data.forEach(function (item, index) {
        var x = document.createElement('li')
        x.textContent = item
        list.appendChild(x)
    })});
