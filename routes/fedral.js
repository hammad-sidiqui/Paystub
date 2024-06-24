var express = require('express');
var router = express.Router();
const Taxee = require('taxee-tax-statistics');
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
/* GET home page. */


//:year
router.get('/',urlencodedParser, (req, res) => {
  const year = 2020// req.params.year;
  const federal = Taxee.default[year];
  
  if( federal['federal'] ) {
      res.send( federal['federal'] );
  } else {
      res.send([]);
  }
});

module.exports = router;
