const dotenv=require('dotenv');
dotenv.config();
function basic_auth (req, res, next) {

    // console.log("basic_auth()")
    if (req.headers.authorization && req.headers.authorization.search('Bearer ') === 0) {
        // console.log("Cond True:========")
        // fetch login and password
        if (req.headers.authorization.split(' ')[1] ==='') {
            next();
            return;
        }
    }
    console.log('Unable to authenticate user');
    // console.log(req.headers.authorization);
    if (req.headers.authorization) {
        setTimeout(function () {
            res.status(401).send('Authentication required');
        }, 5000);
    } else {
        res.status(401).send('Authentication required');
    }
}

module.exports = basic_auth;