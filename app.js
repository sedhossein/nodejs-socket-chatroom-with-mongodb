// ====================== CONFIG ======================
var express = require('express');
var app = express();
// var app = require('express')();
var path = require('path');
var http = require('http').Server(app);
// var io = require('socket.io')(http);

var bodyparser = require('body-parser');
var session = require('express-session');
var morgan = require('morgan');
var mongoose = require('mongoose');
var mpromise = require('mpromise');

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(morgan('common'));
app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: true
}));






// ====================== DB CONECTION ======================
//  mongoDB
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/nodejs");
var db = mongoose.connection;

//  Schemas
var userSchema = new mongoose.Schema({
    username: String,
    password: String
});
var messageSchema = new mongoose.Schema({
    username: String,
    message: String
});

//  Models
var User = mongoose.model("users", userSchema);
var Message = mongoose.model("messages", messageSchema);

//  connection handler
db.on('error', function () {
    console.log("Mongo  Connection Failed! ");
});
db.once("connected", function () {
    console.log("Mongo Connected");
});




//set the template engine ejs
app.set('view engine', 'ejs')

//middlewares
app.use(express.static('public'))








// ====================== ROUTES ======================
//  index
app.get('/', function (req, res) {

    res.sendFile(__dirname + '/views/index.html');
});

//  check session and login handling
app.post('/sign-in', function (req, resp, next) {

    User.findOne({ username: req.body.username }, function (err, user) {

        if (err) throw err;

        if (user) {
            if (user.password === req.body.password) {
                req.session.auth = { username: req.body['username'] };
                // resp.json({ status: "true", redirect: "/chat", msq: "success ... you are sign in" });
                resp.redirect('/chat');
            }
            else {
                resp.json({ status: false, msg: "wrong password or username !!" });
            }
        }
        else {
            resp.json({ status: false, msg: "you are not sign up here !!" });
        }
    })
});



app.post('/sign-up', function (req, resp, next) {

    var request = req.body;
    var is_not_empty = (request.username.length && request.password.length);

    if (is_not_empty) {
        User.find({ username: request.username }, function (err, users) {

            if (err) throw err;

            if (users.length) {
                resp.json({ status: false, msg: "this username is taken befor you, try another one ." })
            }
            else {
                var newUser = new User({
                    username: request.username,
                    password: request.password
                });
                newUser.save();

                resp.json({
                    status: true,
                    msg: " success sign up" +
                        "username:" + request.username +
                        " password:" + request.password
                });

            }
        });
    }
    else {
        resp.json({ status: false, msg: "invalid inputs !!! open your eyes -_- !" });
    }

});



app.get("/logout", function (req, resp, next) {
    req.session.auth = null;
    resp.json({ status: true, redirect: "/" });
});

//  chatroom 
app.get('/chat', function (req, resp) {
    if (req.session.auth)
        resp.render('index')
    else
        resp.json({ status: false, msg: "access denied" });

});






//Listen on port 3000
server = app.listen(3000)



//socket.io instantiation
const io = require("socket.io")(server)


//listen on every connection
io.on('connection', (socket) => {
    console.log('New user connected')
    // console.log(user.)
    //default username
    socket.username = "Anonymous"



    
    //listen on change_username
    socket.on('change_username', (data) => {
        socket.username = data.username
    })

    //listen on new_message
    socket.on('new_message', (data) => {
        //broadcast the new message
        io.sockets.emit('new_message', { message: data.message, username: socket.username });
    })

    //listen on typing
    socket.on('typing', (data) => {
        socket.broadcast.emit('typing', { username: socket.username })
    })
})
