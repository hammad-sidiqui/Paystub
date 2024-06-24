var express = require('express');
var router = express.Router();
const Taxee = require('taxee-tax-statistics');
const Fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const readFile = Promise.promisify(Fs.readFile);
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
const {check, validationResult} = require('express-validator');
/* GET home page. */
router.get('/', function(req, res, next) {
  res.send('paystub generate'); 
});

router.post('/paystub',
[
  check('companyName').not().isEmpty().withMessage('companyName is require'),
  check('companyAddress', 'Company address is optional').optional(),
  check('companyZipCode', 'Company zipcode is optional').optional(),
  check('companyPhoneNumber', 'Company phone number is optional').optional(),
  check('companySSN', 'Company company SSN is optional').optional(),

  check('employeeState').not().isEmpty().withMessage('employeeState is require'),
  check('employeeName').not().isEmpty().withMessage('employeeName is require'),
  check('employeeSSN').not().isEmpty().isNumeric().withMessage('employeeSSN is require'),
  check('employeeZipCode', 'employee zip code is optional').optional(),
  check('employeeid', 'employee id is optional').optional(),      
  check('employeeMaritalStatus', 'Marital Status is optional').optional(),
  check('noOfDependants', 'no of dependants  is optional and should be number').isNumeric().optional(),
  check('ageBlindExemptions', 'age blind exemptions  is optional and should be number').isNumeric().optional(),

  check('salaryAnnual').not().isEmpty().isNumeric().withMessage('salary annual is require'),
  check('email').not().isEmpty().withMessage('email is require'),
  check('payFrequency').not().isEmpty().withMessage('payFrequency is require'),
  check('employeeHireDate', 'employee hire date is optional').optional(),
  check('showHourlyRate', 'show hourly rate is optional').optional(),
  check('checkNoDate', 'check no date is optional').optional(),
  check('payRecord', 'pay record is optional').optional(),
  check('payDate').not().isEmpty().withMessage('payDate is require'),
  check('checkNo').not().isEmpty().isNumeric().withMessage('checkNo  is require and should be number'),
                            
], (req, res, next) => {      
    
    const errors = validationResult(req);    
    console.log(errors);
    if (!errors.isEmpty()) {
      return res.status(422).jsonp(errors.array());
    } else {
      try {

        let data = {
            'companyName': req.body.companyName,
            'companyPhoneNumber': req.body.companyPhoneNumber,
            'name': req.body.employeeName,
            'emplSSN': req.body.employeeSSN,
            'empId': req.body.empolyeeId,
            'empState': req.body.employeeState,
            'empMartialStatus': req.body.employeeMaritalStatus,            
            'checkNo': req.body.checkNo,
            'payRecord': req.body.payDate,
            'payDate': req.body.payDate,
            'regularEarning': req.body.checkNo,
            'ftCurrent': req.body.checkNo,
            'ftYtd': req.body.checkNo,
            'sdiCurrent': req.body.checkNo,
            'sdiYtd': req.body.checkNo,
            'ssCurrent': req.body.checkNo,
            'ssYtd': req.body.checkNo,
            'hitCurrent': req.body.checkNo,
            'hitYtd': req.body.checkNo,
            'ytdGross': 0,
            'ytdDeduction': req.body.checkNo,
            'ytdNetPay': req.body.checkNo,
            'currentTotal': req.body.checkNo,
            'currentDeduction': req.body.checkNo,
            'netPay': req.body.checkNo,
          'companyAddress':req.body.companyAddress

        };

        /* let stateData = getStateDetails(data.empState, data.empMartialStatus);

        let regularEarning = ( req.body.salaryAnnual / 12 ) */

        // calculation and update data
        /* console.log(regularEarning);
        res.send([]); */

        (async () => {
          const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']});
          const page = await browser.newPage();

          let req_template = req.query.template;

          let date = new Date(); time = date.getTime();
          // let fileName =  `paystub.png`;
          let fileName =  `paystub_${time}.png`;
          // dist/thepaystubs
          let pathToSaveImage = path.join(__dirname, `/frontend/src/assets/media/stubs/${fileName}`);
          
          let templateFile = getStubTemplate(req_template);

          let templateHtml = await readFile(
              path.join(
                __dirname,
                `/frontend/src/assets/stub-templates/${templateFile}`
              ),
              "utf8"
            );                

          /** Compile HTML Template to make it executable */
          let template = handlebars.compile(templateHtml);
          
          /** Passing Data into HTML Template */
          let html = template(data);

          /** Adjusting viewport to take screen shot of entire page */
          // await page.setViewport({ width: 1400, height: 700 });
          // await page.goto(templateHtml);
          await page.setContent(html);
          await page.screenshot({ path: pathToSaveImage, type: 'png', fullPage: true });
          await browser.close();

          res.send( {fileName: fileName} );

        })();
      } catch (error) {
        console.error(error);
        console.log('Cannot generate Image', error);
        throw new Error('Cannot generate Image');
      }
    }
});

function getStateDetails( state, martialStatus ) {    
  const y2020 = Taxee.default[2020];    
  
  if( y2020[state] ) {
      return y2020[state][martialStatus];
  } 
  
  return {};
}

function getStubTemplate( key ) {
  const templates = {
      'a': 'Template-A.html',
      'b': 'Template-B.html',
      'c': 'Template-C.html',
      'd': 'Template-D.html'
  }
  
  if( templates[key] ) {
      return templates[key]
  } 
  
  return 'Template-A.html';
}

module.exports = router;
