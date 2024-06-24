var express = require('express');
var router = express.Router();
const Taxee = require('taxee-tax-statistics');
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
/* GET home page. */

router.get('/', (req, res) => {        
  res.send(Taxee.default[2020]);
});

router.get('/:state', urlencodedParser,(req, res) => {
  const y2020 = Taxee.default[2020];
  const state = req.params.state;
  
  if( y2020[state] ) {
      res.send( y2020[state] );
  } else {
      res.send([]);
  }
});



module.exports = router;
