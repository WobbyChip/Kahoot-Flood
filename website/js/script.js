var socket = io.connect();

$("#flood").click(function(e) {
    socket.emit("join_flood", {
        prefix: $('#username')[0].value,
        pin: parseInt($('#pin')[0].value),
        count: parseInt($('#count')[0].value),
    });
});

$("#leave").click(function(e) {
    socket.emit("leave_flood", {pin: parseInt($('#pin')[0].value)});
});