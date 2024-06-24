var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var statesRouter = require('./routes/states');
var generateRouter = require('./routes/generate');
var fedralRouter = require('./routes/fedral');

var auth=require('./middleware/auth')

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, x_requested-With, Content-type, Accept, Authorization');
	if( req.method === 'OPTIONS' ) {
		res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
		return res.status(200).json({});
	}
	next();
});

app.use('/', auth,indexRouter);
app.use('/users', auth,usersRouter);
app.use('/states',auth,statesRouter)
app.use('/generate',auth,generateRouter)
app.use('/federal',auth,fedralRouter)
module.exports = app;
