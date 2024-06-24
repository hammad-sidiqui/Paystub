const express = require('express');
const Taxee = require('taxee-tax-statistics');

const Fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const readFile = Promise.promisify(Fs.readFile);
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const converter = require('number-to-words');
const zips = require('zips');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, x_requested-With, Content-type, Accept, Authorization');
	if( req.method === 'OPTIONS' ) {
		res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
		return res.status(200).json({});
	}
	next();
});

app.listen(8000);

app.get('/', (req, res, next) => {
    res.send('Welcome to Paystub'); 
});

app.get('/states', (req, res) => {        
    res.send(Taxee.default[2020]);
});

app.get('/states/:state', (req, res) => {
    const y2020 = Taxee.default[2020];
    const state = req.params.state;
    
    if( y2020[state] ) {
        res.send( y2020[state] );
    } else {
        res.send([]);
    }
});

app.get('/federal/:year', (req, res) => {
    const year = req.params.year;
    const federal = Taxee.default[year];
    
    if( federal['federal'] ) {
        res.send( federal['federal'] );
    } else {
        res.send([]);
    }
});

app.post('/getlocation', (req, res) => {

  const zip = req.body.zipcode;
  let loc = zips.getByZipCode( zip );
  let response = [];

  if( loc ) {
    response = { 'status': true, 'location': loc.city + ', ' + loc.state + ' ' + loc.zip };
  } else {
    response = { 'status': false, 'message': 'not found' };
  }

  res.send(response);
});

app.post( '/generate/paystub',
    async (req, res, next) => {
        try {

          let hourly = req.body.hourlyRate;
          let salaryCheck = hourly ? parseFloat((req.body.hourlyRate) * 80) * 12 : parseFloat(req.body.salaryAnnual);
          let salary = hourly ? parseFloat((req.body.hourlyRate) * 80) : parseFloat(req.body.salaryAnnual);
          let fedTax = (salaryCheck > 3700) ? await GetFederalTax(req.body.employeeMaritalStatus,salary) : 0;
            
          setTimeout(async () => {
              let data = await GetData(req, fedTax);
              console.log(data);
              const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
              const page = await browser.newPage();
              
              let req_template = req.query.template;
              let fileName = '';
              
              if( req.query.file ) {
                fileName = req.query.file;
                data.watermark = false;
              } else {
                let date = new Date();
                time = date.getTime();
                // let fileName =  `paystub.png`;
                fileName = `paystub_${time}.png`;
                data.watermark = true;
              }

              // dist/thepaystubs
              let pathToSaveImage = path.join(__dirname, `/frontend/dist/thepaystubs/assets/media/stubs/${fileName}`);

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

              setTimeout(async () => {
                await page.screenshot({ path: pathToSaveImage, type: "png", fullPage: true });
                await browser.close();
                res.send({ fileName: fileName });
              }, 1000);
          }, 500);
        } catch (error) {
          console.error(error);
          console.log("Cannot generate Image", error);
          throw new Error("Cannot generate Image");
        }
    }
);

app.post( '/generate/w2', async (req, res, next) => {  
  try {                    
    
    setTimeout(async () => {
      (async () => {
          let data = await GetW2Data(req);
          const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']});
          const page = await browser.newPage();

          let req_template = req.query.template;
          let fileName = '';

          if( req.query.file ) {
            fileName = req.query.file;
            data.watermark = false;
          } else {
            let date = new Date(); time = date.getTime();
            // let fileName =  `paystub.png`;
            fileName =  `paystub_${time}.png`;
            data.watermark = true;
          }
                    
          let pathToSaveImage = path.join(__dirname, `/frontend/dist/thepaystubs/assets/media/w2/${fileName}`);
          let templateFile = getW2Template(req_template);

          let templateHtml = await readFile(
              path.join(
                __dirname,
                `/frontend/src/assets/w2-templates/${templateFile}`
              ),
              "utf8"
            );                

          /** Compile HTML Template to make it executable */
          let template = handlebars.compile(templateHtml);
          
          /** Passing Data into HTML Template */
          let html = template(data);

          /** Adjusting viewport to take screen shot of entire page */
          await page.setContent(html);

          setTimeout(async () => {
            await page.screenshot({ path: pathToSaveImage, type: 'png', fullPage: true });
            await browser.close();
            res.send( {fileName: fileName} );
          }, 1000);

      })();
    }, 500);

  } catch (error) {
      console.error(error);
      console.log("Cannot generate Image", error);
      throw new Error("Cannot generate Image");
  }
});

app.get( '/download/paystub', (req, res, next) => {
  let file = req.query.template;  
  let fileToDownload = `${__dirname}/frontend/dist/thepaystubs/${file}`;
  res.download(fileToDownload)
});

function GetW2Data(req) {

  let data = {
    // company info
    companyTaxYear: req.body.companyTaxYear,
    companyEIN: req.body.employerIdentificationNumber,
    businessName: req.body.businessName,
    companyStreetAddress: req.body.companyStreetAddress,
    companyZipCode: req.body.companyZipCode,
    companyLocation: req.body.location,
    controlNumber: req.body.controlNumber,
    stateIDNumber: req.body.stateIDNumber,

    // employee info
    empFirstName: req.body.employeeFirstName,
    empLastName: req.body.employeeLastName,
    empSSN: req.body.socialSecurityNumber,
    empStreetAddress: req.body.employeeStreetAddress,
    empState: req.body.employeeState,
    empZipCode: req.body.employeeZipCode,
    empNoOfDependants: req.body.noOfDependants,
    empNoOfExemptions: req.body.noOfExemptions,
    annualSalary: req.body.annualSalary,
    employeeMaritalStatus: req.body.martialStatus ? req.body.martialStatus: 'single',
    
    // salary info
    statutoryEmployee: req.body.statutoryEmployee,
    retirementPlan: req.body.retirementPlan,
    thirdPartySickPay: req.body.thirdPartySickPay,
    taxCode12a: req.body.taxCode12a,
    amountTaxCode12a: req.body.amountTaxCode12a,
    taxCode12b: req.body.taxCode12b,
    amountTaxCode12b: req.body.amountTaxCode12b,
    taxCode12c: req.body.taxCode12c,
    amountTaxCode12c: req.body.amountTaxCode12d,
    taxCode12d: req.body.taxCode12d,
    amountTaxCode12d: req.body.amountTaxCode12d,
    email: req.body.email,
    payDate: formatMMDDYYYY(req.body.payDate ? req.body.payDate : new Date()),
    federalTax: 0,
    socialSecurityTaxWithHeld: 0,
    MedicareTaxWithHeld: 0,
    stateTax: 0,
    showhidestate: false,

    NYC_Income_Tax: 0,
    SDI:0,
    Bond:0,
    fourZeroOnek:0,
    zeroFiveTwo:0,
    stockPlan:0,
    lifeInsurance:0,
    loan:0,
    federalTaxYtd:0,
    socialSecurityTaxWithHeldYtd:0,
    MedicareTaxWithHeldYtd:0,
    stateTaxYtd:0,
    showhidestateYtd:false,
    NYC_Income_TaxYtd:0,
    SDIYtd:0,
    BondYtd:0,
    fourZeroOnekYtd:0,
    stockPlanYtd:0,
    lifeInsuranceYtd:0,
    loanYtd:0,
    Checking:0,
    CheckingYTD:0,
    sickLeaveBalance:0,
    VacationLeaveBalance:0,
    sickLeaveBalanceYtd:0,
    VacationLeaveBalanceYtd:0,
    lifeInsuranceAdjustment:0,
    netPay:0,
    federalTaxableWages:0,
    regularRate:0,
    overtimeRate:0,
    holidayRate:0,
    tutionRate:0,
    regularHours:0,
    overtimeHours:0,
    holidayHours:0,
    tutionHours:0,
    regularPeriod:0,
    overtimePeriod:0,
    holidayPeriod:0,
    tutionPeriod:0,
    regularYtd:0,
    overtimeYtd:0,
    holidayYtd:0,
    tutionYtd:0,
    grossPay:0,
    grossPayYtd:0,
    periodEnding:0,
    groupTermLife:0,
    loanAmountPaid:0,
    vacHours:0,
    sickHours:0,
    sickPeriod:0,
    groupTermLifeYtd:0,
    loanAmountPaidYtd:0,
    vacHoursYtd:0,
    vacRate:0,
    vacPeriod:0,
    vacHoursYtd:0,
    floatRate:0,
    floatPeriod:0,
    floatHours:0,
    floatYTD:0,
    bonusRate:0,
    bonusPeriod:0,
    bonusHours:0,
    bonusYTD:0,
    unionDues:0,
    unionDuesYtd:0,
    sickHoursYtd:0,
    title:req.body.title,
    co:req.body.co,
    file:req.body.file,
    dept:req.body.dept,
    clock:req.body.clock,
    number:0,
    exemptionsFederal:req.body.exemptionsFederal? req.body.exemptionsFederal:0,
    exemptionsState: req.body.exemptionsState?req.body.exemptionsState: 0,
    exemptionsLocal:req.body.exemptionsLocal?req.body.exemptionsLocal:0,
    amountInWords:'',
    amount:0,
    hourly:0,//parseInt(req.body.annualSalary) / 52 / 40 ,
    hours: 0,//req.body.hours?req.body.hours:80,
    payRecord: '',
    payRecordStart: '',
    payRecordEnd: ''
  };

  var currDate= new Date();
  // data.payDate= data.payDate?data.payDate:currDate

  var PayRecordDate = payRecord( req.body.payDate? req.body.payDate: currDate, req.body.payFrequency);
  data.payRecord = PayRecordDate;
  data.payRecordStart = PayRecordDate.split("-")[0];
  data.payRecordEnd = PayRecordDate.split("-")[1];
  data.empState =  req.body.employeeState.replace(/[-_.]/g, " ").replace(/(\b[a-z](?!\s))/g, function(x){return x.toUpperCase();})
  let salary = parseFloat(req.body.annualSalary);
  let fedTax = GetFederalTax('single',salary)
  fedTax = (salary > 3700) ? fedTax : 0;
  let socialSecurityTaxWithHeld, MedicareTaxWithHeld = 0;
  socialSecurityTaxWithHeld = parseFloat(req.body.annualSalary) * 0.062;
  MedicareTaxWithHeld = parseFloat(req.body.annualSalary) * 0.0145;
  let stateTax = (salary > 3700) ? GetStateTax(req.body.employeeState, 'single', ((req.body.companyTaxYear) ? req.body.companyTaxYear : 2020) , req.body.annualSalary) : 0;
  data.federalTax = formatNumber( fedTax );
  data.socialSecurityTaxWithHeld = socialSecurityTaxWithHeld;
  data.MedicareTaxWithHeld = MedicareTaxWithHeld;
  data.stateTax = parseFloat(stateTax).toFixed(2);
  data.showhidestate = stateTax > 0 ? true : false;

  if (req.body.payFrequency) {
    
    if (req.body.payFrequency == "monthly") {
    
      let regularEarning =  parseFloat(req.body.annualSalary / 12);
      console.log("REG ERN ",regularEarning)
      console.log(req.body.payFrequency);
      stateTax=stateTax/12
      socialSecurityTaxWithHeld = socialSecurityTaxWithHeld/12;
      MedicareTaxWithHeld = MedicareTaxWithHeld/12;
      
      let fedTaxsignlemonth = parseFloat(fedTax / 12);
      let noOfPays = new Date().getMonth() + 1;
      let currentDeduction= fedTaxsignlemonth+stateTax+socialSecurityTaxWithHeld+MedicareTaxWithHeld
      let ytdDeduction= (fedTaxsignlemonth * noOfPays)+(stateTax * noOfPays)+(socialSecurityTaxWithHeld* noOfPays)+(MedicareTaxWithHeld*noOfPays) 
      let ytdNetPay = regularEarning * noOfPays - ytdDeduction;
      data.ftCurrent = formatNumber(fedTaxsignlemonth);
      data.ftYtd = formatNumber(fedTaxsignlemonth * noOfPays);
      data.ytdGross = formatNumber(regularEarning * noOfPays);
      data.regularEarning = formatNumber(regularEarning);
      data.ytdDeduction = formatNumber(ytdDeduction);
      data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
      data.currentTotal = formatNumber(regularEarning);
      data.currentDeduction = formatNumber(currentDeduction);
      data.netPay = formatNumber( regularEarning - currentDeduction); //data.ftYtd;
      data.stateTax = formatNumber(stateTax)
      data.stateTaxytd = formatNumber(stateTax*noOfPays)
      data.ssCurrent = formatNumber(socialSecurityTaxWithHeld)
      data.ssYtd = formatNumber(socialSecurityTaxWithHeld * noOfPays)
      data.hitCurrent = formatNumber( MedicareTaxWithHeld)
      data.hitYtd=formatNumber(MedicareTaxWithHeld*noOfPays)
      
      var p = parseFloat(regularEarning - currentDeduction).toFixed(2)
      var n = ( p+ "").split(".")[1];
    
      //  data.amountInWords= n? converter.toWords(regularEarning - currentDeduction) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords(regularEarning - currentDeduction);
     
      
    } else if (req.body.payFrequency == "onetime") {
      console.log(req.body.payFrequency);
      console.log(fedTax);
      let fedTaxsingle = parseFloat(fedTax).toFixed(2);
      let currentDeduction= fedTax+stateTax+socialSecurityTaxWithHeld+MedicareTaxWithHeld
      let ytdDeduction= fedTax+stateTax+socialSecurityTaxWithHeld+MedicareTaxWithHeld
      let regularEarning = parseFloat(req.body.annualSalary);
    
      let noOfPays = new Date().getMonth() + 1;
      let ytdNetPay = regularEarning - ytdDeduction;
      data.ftCurrent = formatNumber(fedTaxsingle);
      data.federalTaxYtd = formatNumber(fedTaxsingle);
      data.ytdGross = formatNumber(regularEarning);
      data.regularEarning = formatNumber(regularEarning);
      data.ytdDeduction = formatNumber(ytdDeduction);
      data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
      data.currentTotal = formatNumber(regularEarning);
      data.currentDeduction = formatNumber(currentDeduction);
      data.netPay = currencyFormat(regularEarning - currentDeduction);
      data.stateTax= formatNumber(stateTax)
      data.stateTaxYtd=formatNumber(data.stateTax)
      data.ssCurrent=formatNumber(socialSecurityTaxWithHeld)
      data.socialSecurityTaxWithHeldYtd=formatNumber(socialSecurityTaxWithHeld)
  
      data.grossPay=formatNumber(regularEarning);
      data.grossPayYtd=formatNumber(regularEarning);
      data.netPay=formatNumber(currentDeduction);
      data.MedicareTaxWithHeld=formatNumber(MedicareTaxWithHeld)
      data.MedicareTaxWithHeldYtd=formatNumber(MedicareTaxWithHeld)
      var p = parseFloat( currentDeduction).toFixed(2)
      var n = ( p+ "").split(".")[1];
        // data.amountInWords= n? converter.toWords(currentDeduction ) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords( currentDeduction);
     
    } else if (req.body.payFrequency == "annually") {
      console.log(req.body.payFrequency);
      console.log(fedTax);
      let fedTaxsingle = parseFloat(fedTax).toFixed(2);
      let currentDeduction= fedTax+stateTax+socialSecurityTaxWithHeld+MedicareTaxWithHeld
      let ytdDeduction= fedTax+stateTax+socialSecurityTaxWithHeld+MedicareTaxWithHeld
      let regularEarning =  parseFloat(req.body.annualSalary);
      let noOfPays = new Date().getMonth() + 1;
      let ytdNetPay = regularEarning - ytdDeduction;
      data.ftCurrent = formatNumber(fedTaxsingle);
      data.federalTaxYtd = formatNumber(fedTaxsingle);
      data.ytdGross = formatNumber(regularEarning);
      data.regularEarning = formatNumber(regularEarning);
      data.ytdDeduction = formatNumber(ytdDeduction);
      data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
      data.currentTotal = formatNumber(regularEarning);
      data.currentDeduction = formatNumber(currentDeduction);
      data.netPay = currencyFormat(regularEarning - currentDeduction);
      data.stateTax= formatNumber(stateTax)
      data.stateTaxYtd=data.stateTax
      data.ssCurrent=formatNumber(socialSecurityTaxWithHeld)
      data.socialSecurityTaxWithHeldYtd=formatNumber(socialSecurityTaxWithHeld)
      data.grossPay=formatNumber(regularEarning);
      data.grossPayYtd=formatNumber( regularEarning);
      data.netPay= currentDeduction;
      data.MedicareTaxWithHeld=formatNumber(MedicareTaxWithHeld)
      data.MedicareTaxWithHeldYtd=formatNumber(MedicareTaxWithHeld)
      var p = parseFloat(currentDeduction).toFixed(2)
      var n = (p+ "").split(".")[1];
      //  data.amountInWords= n? converter.toWords(currentDeduction) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords(currentDeduction);
     
    } else if (req.body.payFrequency == "daily") {
      //this should be fiorst month of year
      var d = new Date(new Date().getFullYear(), 0, 1);
      var date1 = new Date(req.body.payDate);
      // get total seconds between two dates
      var res = Math.abs(date1 - d) / 1000;
      var noOfPays = Math.floor(res / 86400);
      console.log("No of pays", noOfPays);
      console.log(req.body.payFrequency);
      console.log("WPD",req.body.Worked_Per_Pay)
      let regularEarning = parseFloat(req.body.annualSalary / 12 / 30);
      // let regularEarning = parseFloat(req.body.salaryAnnual / 12 / 30).toFixed(2);
      let fedTaxsingle = parseFloat(fedTax).toFixed(2);
      fedTaxsingle =  parseFloat(fedTaxsingle / 12 / 30).toFixed(2);
      stateTax=((stateTax/12)/30)
      console.log("Fed",fedTaxsingle)
      socialSecurityTaxWithHeld=(socialSecurityTaxWithHeld/12)/30
      MedicareTaxWithHeld=((MedicareTaxWithHeld/12)/30)
      let currentDeduction= (parseFloat(fedTaxsingle)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld))
      console.log("REG ern", regularEarning)
      let ytdDeduction= (fedTaxsingle * noOfPays)+(stateTax * noOfPays)+(socialSecurityTaxWithHeld* noOfPays)+(MedicareTaxWithHeld*noOfPays) 
      let ytdNetPay = regularEarning * noOfPays - ytdDeduction;
      data.federalTax = formatNumber(fedTaxsingle);
      data.federalTaxYtd = formatNumber(parseFloat(fedTaxsingle * noOfPays).toFixed(2));
      data.ytdGross = formatNumber(regularEarning * noOfPays);
      data.regularEarning = formatNumber(regularEarning);
      data.ytdDeduction = formatNumber( ytdDeduction);
      data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
      data.currentTotal = formatNumber(regularEarning);
      data.currentDeduction =formatNumber(currentDeduction);
      data.netPay = currencyFormat( currentDeduction);
      data.stateTax= formatNumber(stateTax)
      data.stateTaxYtd=formatNumber(stateTax *noOfPays)
      data.socialSecurityTaxWithHeld=formatNumber(socialSecurityTaxWithHeld)
      data.socialSecurityTaxWithHeldYtd=formatNumber((socialSecurityTaxWithHeld*noOfPays))
      data.MedicareTaxWithHeld=formatNumber(MedicareTaxWithHeld)
      data.MedicareTaxWithHeldYtd=formatNumber(MedicareTaxWithHeld*noOfPays)
      data.grossPay=formatNumber(regularEarning);
      data.grossPayYtd=formatNumber(regularEarning*noOfPays);
      var p = parseFloat(currentDeduction).toFixed(2)
      var n = ( p+ "").split(".")[1];
      // data.amountInWords= n? converter.toWords(currentDeduction) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords( currentDeduction);
     
    } else if (req.body.payFrequency == "semimonthly") {
      console.log(req.body.payFrequency);
  
      let dateStarted = new Date(req.body.payDate);
      var noOfPays = getNumberOfsemimonth(dateStarted);
      let regularEarning = parseFloat(req.body.annualSalary / 12 / 2).toFixed(2)
      // let regularEarning = parseFloat(req.body.salaryAnnual / 12 / 2).toFixed(2);
      let fedTaxsignlemonth = parseFloat(fedTax / 12 / 2);
      socialSecurityTaxWithHeld=((socialSecurityTaxWithHeld/12)/2)
      MedicareTaxWithHeld=((MedicareTaxWithHeld/12)/2)
      stateTax=((stateTax/12)/2)
      console.log("No of pays", noOfPays);
      console.log("MedicareTaxWithHeld",MedicareTaxWithHeld)
      let currentDeduction= (parseFloat(fedTaxsignlemonth)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld))
    
      let ytdDeduction= (fedTaxsignlemonth * noOfPays)+(stateTax * noOfPays)+(socialSecurityTaxWithHeld* noOfPays)+(MedicareTaxWithHeld*noOfPays) 
      
      let ytdNetPay = regularEarning * noOfPays - ytdDeduction;
      data.federalTax = formatNumber(fedTaxsignlemonth);
      data.federalTaxYtd = formatNumber(fedTaxsignlemonth * noOfPays);
      data.ytdGross = formatNumber(regularEarning * noOfPays);
      data.regularEarning = formatNumber(regularEarning);
      data.ytdDeduction = formatNumber(ytdDeduction);
      data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
      data.currentTotal = formatNumber(regularEarning);
      data.currentDeduction = formatNumber(currentDeduction);
      data.netPay = currencyFormat(regularEarning - currentDeduction);
      data.stateTax= formatNumber(stateTax)
      data.stateTaxYtd=formatNumber(stateTax* noOfPays)  
      data.socialSecurityTaxWithHeld=formatNumber(socialSecurityTaxWithHeld)
  
      data.socialSecurityTaxWithHeldYtd=formatNumber((socialSecurityTaxWithHeld*noOfPays))
      data.MedicareTaxWithHeld=formatNumber(MedicareTaxWithHeld)
      data.MedicareTaxWithHeldYtd=formatNumber(MedicareTaxWithHeld*noOfPays)
      data.grossPay=formatNumber(regularEarning);
      data.grossPayYtd=formatNumber(regularEarning*noOfPays);
  
  
      var p = parseFloat(regularEarning - currentDeduction).toFixed(2)
      var n = ( p+ "").split(".")[1];  
       data.amountInWords= n? converter.toWords(regularEarning - currentDeduction) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords(regularEarning - currentDeduction);
     
    } else if (req.body.payFrequency == "weekly") {
      console.log(req.body.payFrequency);
  
      let dateStarted = new Date(req.body.payDate);
      var noOfPays = getNumberOfWeek();
      console.log("days of ", noOfPays);
  
      let monthlysalary = req.body.annualSalary / 12;
      let regularEarning = parseFloat((monthlysalary / 30) * 7)
      console.log("regularEarning",regularEarning)
      // let regularEarning = parseFloat((monthlysalary / 30) * 7).toFixed(2);
      let fedTaxMonth = fedTax / 12;
      let fedTaxsignlemonth = parseFloat((fedTaxMonth / 30) * 7);
      stateTax=(((stateTax/12)/30)*7)
      socialSecurityTaxWithHeld=(((socialSecurityTaxWithHeld/12)/30)*7)
      MedicareTaxWithHeld=(((MedicareTaxWithHeld/12)/30)*7)
      let currentDeduction= (parseFloat(fedTaxsignlemonth)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld))
    
      let ytdDeduction= (fedTaxsignlemonth * noOfPays) + (stateTax*noOfPays) + (socialSecurityTaxWithHeld*noOfPays) + (MedicareTaxWithHeld*noOfPays) 
      
      console.log("No of pays", noOfPays);
      let ytdNetPay = regularEarning * noOfPays - ytdDeduction;
      data.federalTax = formatNumber(fedTaxsignlemonth);
      data.federalTaxYtd = formatNumber(fedTaxsignlemonth * noOfPays);
      data.ytdGross = formatNumber(regularEarning * noOfPays);
      data.regularEarning = formatNumber(regularEarning);
      data.ytdDeduction = formatNumber(ytdDeduction);
      data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
      data.currentTotal = formatNumber(regularEarning);
      data.currentDeduction = formatNumber(currentDeduction);
      data.netPay = currencyFormat(regularEarning - currentDeduction);
      data.stateTax= formatNumber(stateTax)
      data.stateTaxYtd= formatNumber(stateTax*noOfPays)
      data.socialSecurityTaxWithHeld=formatNumber(socialSecurityTaxWithHeld)
      data.socialSecurityTaxWithHeldYtd=formatNumber((socialSecurityTaxWithHeld*noOfPays))
      data.MedicareTaxWithHeld=formatNumber(MedicareTaxWithHeld)
      data.MedicareTaxWithHeldYtd=formatNumber(MedicareTaxWithHeld*noOfPays)
      data.grossPay=formatNumber(regularEarning);
      data.grossPayYtd=formatNumber(regularEarning*noOfPays);
  
      var p = parseFloat(regularEarning - currentDeduction).toFixed(2)
      var n = ( p+ "").split(".")[1];
    
      //  data.amountInWords= n? converter.toWords(regularEarning - currentDeduction) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords(regularEarning - currentDeduction);
     
    } else if (req.body.payFrequency == "biweekly") {
      console.log(req.body.payFrequency);
  
      let dateStarted = new Date(req.body.payDate);
      var noOfPays =  getNumberOfWeek() / 2;
      console.log("days of ", noOfPays);

      //  let monthlysalary = parseFloat( req.body.annualSalary / 12).toFixed(2);
      let regularEarning = parseFloat(req.body.annualSalary / 26 )
      // let regularEarning = parseFloat((monthlysalary / 30) * 7 * 2).toFixed(2);
      // let fedTaxMonth = fedTax / 12;
      console.log("rrr",regularEarning)
      let fedTaxsignlemonth = parseFloat(fedTax / 26);
      stateTax=(stateTax /26)
      socialSecurityTaxWithHeld=(socialSecurityTaxWithHeld /26)
      
      MedicareTaxWithHeld=MedicareTaxWithHeld
      let currentDeduction= (parseFloat(fedTaxsignlemonth)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld))
      let ytdDeduction= (fedTaxsignlemonth * noOfPays) + (stateTax*noOfPays) + (socialSecurityTaxWithHeld*noOfPays) + (MedicareTaxWithHeld*noOfPays)
      console.log("No of pays", noOfPays);
      let ytdNetPay = regularEarning * noOfPays - ytdDeduction;
      data.federalTax = formatNumber(fedTaxsignlemonth);
      data.federalTaxYtd = formatNumber(fedTaxsignlemonth * noOfPays);
      data.ytdGross = formatNumber(regularEarning * noOfPays);
      data.regularEarning = formatNumber(regularEarning);
      data.ytdDeduction = formatNumber(ytdDeduction);
      data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
      data.currentTotal = formatNumber(regularEarning);
      data.currentDeduction = formatNumber(currentDeduction);
      data.netPay = currencyFormat( currentDeduction);
      data.stateTax=  formatNumber(stateTax)
      data.stateTaxYtd= formatNumber(stateTax*noOfPays)
      data.socialSecurityTaxWithHeld=formatNumber(socialSecurityTaxWithHeld)
      data.socialSecurityTaxWithHeldYtd=formatNumber((socialSecurityTaxWithHeld*noOfPays))
      data.MedicareTaxWithHeld=formatNumber(MedicareTaxWithHeld)
      data.MedicareTaxWithHeldYtd=formatNumber(MedicareTaxWithHeld*noOfPays)
      data.grossPay=formatNumber(regularEarning);
      data.grossPayYtd=formatNumber(regularEarning*noOfPays);
  
      var p = parseFloat(currentDeduction).toFixed(2)
      var n = ( p+ "").split(".")[1];
      //  data.amountInWords= n? converter.toWords( currentDeduction) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords( currentDeduction);
     
    } else if (req.body.payFrequency == "quarterly") {
      console.log(req.body.payFrequency);
      
      let regularEarning =  parseFloat(req.body.annualSalary / 4)
      // let regularEarning = parseFloat(req.body.salaryAnnual / 4).toFixed(2);
      let fedTaxsignlemonth = parseFloat(fedTax / 4);
      var dt = new Date(req.body.payDate);
      let noOfPays = getNumberOfQuatar(dt);
      stateTax=stateTax/4
      socialSecurityTaxWithHeld=socialSecurityTaxWithHeld/4
      MedicareTaxWithHeld= MedicareTaxWithHeld/4
      let currentDeduction= (parseFloat(fedTaxsignlemonth)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld))
      let ytdDeduction= (fedTaxsignlemonth * noOfPays) + (stateTax*noOfPays) + (socialSecurityTaxWithHeld*noOfPays) + (MedicareTaxWithHeld*noOfPays)
     
      console.log("no of pays", noOfPays);
      let ytdNetPay = regularEarning * noOfPays - ytdDeduction;
      data.federalTax = formatNumber(fedTaxsignlemonth);
      data.federalTaxYtd = formatNumber(fedTaxsignlemonth * noOfPays);
      data.ytdGross = formatNumber(regularEarning * noOfPays);
      data.regularEarning = formatNumber(regularEarning);
      data.ytdDeduction = formatNumber(ytdDeduction);
      data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
      data.currentTotal = formatNumber(regularEarning);
      data.currentDeduction = formatNumber(currentDeduction);
      data.netPay = currencyFormat( currentDeduction);
      data.stateTax= formatNumber (stateTax)
      
      data.stateTaxYtd=formatNumber(stateTax *noOfPays)
      data.socialSecurityTaxWithHeld=formatNumber(socialSecurityTaxWithHeld)
      data.socialSecurityTaxWithHeldYtd=formatNumber((socialSecurityTaxWithHeld*noOfPays))
      data.MedicareTaxWithHeld=formatNumber(MedicareTaxWithHeld)
      data.MedicareTaxWithHeldYtd=formatNumber(MedicareTaxWithHeld*noOfPays)
      data.grossPay=formatNumber(regularEarning);
      data.grossPayYtd=formatNumber(regularEarning*noOfPays);
  
      var p = parseFloat( currentDeduction).toFixed(2)
      var n = ( p+ "").split(".")[1];
    
      //  data.amountInWords= n? converter.toWords( currentDeduction) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords( currentDeduction);
     
    } else if (req.body.payFrequency == "semiannually") {
      console.log(req.body.payFrequency);
      var dt = new Date(req.body.payDate);
      let noOfPays = getNumberOfSemiAnnual(dt);
      let fedTaxsignlemonth = parseFloat(fedTax / 2);
      stateTax=stateTax/2
      socialSecurityTaxWithHeld=socialSecurityTaxWithHeld/2
      MedicareTaxWithHeld=MedicareTaxWithHeld/2
      console.log("noOfPays", noOfPays);
      let currentDeduction= (parseFloat(fedTaxsignlemonth)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld))
      let ytdDeduction= (fedTaxsignlemonth * noOfPays) + (stateTax*noOfPays) + (socialSecurityTaxWithHeld*noOfPays) + (MedicareTaxWithHeld*noOfPays)
      let regularEarning =parseFloat(req.body.annualSalary / 2);
      // let regularEarning = parseFloat(req.body.salaryAnnual / 2).toFixed(2);
      let ytdNetPay = regularEarning * noOfPays - ytdDeduction;
      data.federalTax = formatNumber(fedTaxsignlemonth);
      data.federalTaxYtd = formatNumber(fedTaxsignlemonth * noOfPays);
      data.ytdGross = formatNumber(regularEarning * noOfPays);
      data.regularEarning = formatNumber(regularEarning);
      data.ytdDeduction = formatNumber(ytdDeduction);
      data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
      data.currentTotal = formatNumber(regularEarning);
      data.currentDeduction = formatNumber(currentDeduction);
      data.netPay = currencyFormat(regularEarning - currentDeduction);
      data.stateTax= formatNumber(stateTax) 
      data.stateTaxYtd=formatNumber(stateTax *noOfPays)
      data.socialSecurityTaxWithHeld=formatNumber(socialSecurityTaxWithHeld)
      data.socialSecurityTaxWithHeldYtd=formatNumber((socialSecurityTaxWithHeld*noOfPays))
      data.MedicareTaxWithHeld=formatNumber(MedicareTaxWithHeld)
      data.MedicareTaxWithHeldYtd=formatNumber(MedicareTaxWithHeld*noOfPays)
      data.grossPay=formatNumber(regularEarning);
      data.grossPayYtd=formatNumber(regularEarning*noOfPays);
      
      var p = parseFloat(currentDeduction).toFixed(2)
      var n = ( p+ "").split(".")[1];
      //  data.amountInWords= n?  converter.toWords( currentDeduction) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords( currentDeduction);
     
    }
  } else {
    let fedTaxsingle = parseFloat(fedTax).toFixed(2);
    let currentDeduction = fedTax + stateTax+socialSecurityTaxWithHeld+MedicareTaxWithHeld
    let ytdDeduction = fedTax + stateTax+socialSecurityTaxWithHeld+MedicareTaxWithHeld
    let regularEarning =  parseFloat(req.body.annualSalary);
    let noOfPays = new Date().getMonth() + 1;
    let ytdNetPay = regularEarning - ytdDeduction;
    data.ftCurrent = formatNumber(fedTaxsingle);
    data.federalTaxYtd = formatNumber(fedTaxsingle);
    data.ytdGross = formatNumber(regularEarning);
    data.regularEarning = formatNumber(regularEarning);
    data.ytdDeduction = formatNumber(ytdDeduction);
    data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
    data.currentTotal = formatNumber(regularEarning);
    data.currentDeduction = formatNumber(currentDeduction);
    data.netPay = currencyFormat(regularEarning - currentDeduction);
    data.stateTax= formatNumber(stateTax)
    data.stateTaxYtd=data.stateTax
    data.ssCurrent=formatNumber(socialSecurityTaxWithHeld)
    data.socialSecurityTaxWithHeldYtd=formatNumber(socialSecurityTaxWithHeld)
    data.grossPay=formatNumber(regularEarning);
    data.grossPayYtd=formatNumber( regularEarning);
    // data.netPay= currentDeduction;
    data.MedicareTaxWithHeld=formatNumber(MedicareTaxWithHeld)
    data.MedicareTaxWithHeldYtd=formatNumber(MedicareTaxWithHeld)
    var p = parseFloat(regularEarning - currentDeduction).toFixed(2)
    var n = (p+ "").split(".")[1];
      // data.amountInWords= n? converter.toWords(regularEarning - currentDeduction) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords(regularEarning-currentDeduction);     
  }

  return data;
}

function GetData(req, fedTax) {
  
  let current_date = new Date();
  let hourly = req.body.hourlyRate;
  let salary = hourly ? parseFloat((req.body.hourlyRate) *80)   : parseFloat(req.body.salaryAnnual);
  
  let socialSecurityTaxWithHeld = salary * 0.062;
  let MedicareTaxWithHeld = salary * 0.0145;
  let martialStatus = req.body.employeeMaritalStatus && req.body.employeeMaritalStatus != '(optional)' && req.body.employeeMaritalStatus != 'dontKnow' ? req.body.employeeMaritalStatus : 'single';
  let stateTax = (salary > 3700) ? GetStateTax(req.body.employeeState, martialStatus, 2020, salary) : 0;
  console.log(req.body.employeeState, martialStatus);
  let parsedDate = req.body.payDate;

  if (!isNaN(Date.parse(parsedDate))) {
    console.log("Valid Date \n");
  } else {
    req.body.payDate = req.body.checkNoDate;
    if (!isNaN(Date.parse(req.body.payDate))) {
      console.log("Valid check no Date assigned \n");
    } else{
      console.log("valid date not provided date ");
      req.body.payDate = new Date();
    }
  }

  let data = {
      // company info
      'companyName': req.body.companyName,
      'companyLogo': req.body.companyLogo,
      'companyAddress': req.body.companyAddress,
      'companyZipCode': req.body.companyZipCode,
      'companyPhoneNumber': req.body.companyPhoneNumber,
      'companyEinSsn': (req.body.companyEinSsn) ? 'EIN: ' + req.body.companyEinSsn : '',

      // employee info
      'empState': req.body.employeeState,
      'empName': req.body.employeeName,
      // 'empStatus': req.body.employeeStatus,
      'empSSN': req.body.employeeSSN,
      'empAddress': req.body.employeeAddress,
      'empZipCode': req.body.employeeZipCode,
      'empId': req.body.employeeId,
      'empMartialStatus': req.body.employeeMaritalStatus,
      'employeeNoOfDependants': req.body.employeeNoOfDependants,
      // 'empAgeBlind': req.body.employeeAgeBlind,

      // salary info
      'salaryAnnual': req.body.salaryAnnual,
      'hourlyRate': req.body.hourlyRate,
      'email': req.body.email,
      'payFrequency': req.body.payFrequency,
      'payDate': formatMMDDYYYY( req.body.payDate ),
      'employeeHireDate': req.body.employeeHireDate,
      'checkNoDate': req.body.checkNoDate,
      'checkNo': req.body.checkNo,
      'payRecord': payRecord( req.body.payDate ),

      'currDate': current_date.toISOString().slice(0,10),

      // these all are will calculate
      'regularEarning': 0,
      'rates': '',
      'hours': '',
      'ftCurrent': 0,
      'ftYtd': 0,
      'sdiCurrent': 0,
      'sdiYtd': 0,
      'ssCurrent': 0,
      'ssYtd': 0,
      'hitCurrent': 0,
      'hitYtd': 0,

      'totalYtdEarning': 0,
      'totalDeduction': 0,
      'totalYtdDeduction': 0,

      'ytdGross': 0,
      'ytdDeduction': 0,
      'ytdNetPay': 0,
      'currentTotal': 0,
      'currentDeduction': 0,
      'netPay': 0,
      'stateTax': 0,
      'stateTaxytd': 0,
      'showhidestate': false,
      'showhidsdi': false,
      'amountInWords': '',
      'payRecordStart': '',
      'payRecordEnd': '',

      // additions / deductions
      "additions": req.body.additions,
      "deductions": req.body.deductions,
      "additiondesc1": '',
      "deductiondesc1": '',
      "additionCurrentAmount1": '',
      "deductionCurrentAmount1": '',
      "deductionCurrentAmountYtd1": '',
      "showhideaddtion": req.body.additions ? true: false,
      "showhideDeduction": req.body.deductions ? true: false
  };

  var PayRecordDate = payRecord( req.body.payDate, req.body.payFrequency);
  data.payRecord = PayRecordDate;
  data.payRecordStart = PayRecordDate.split("-")[0];
  data.payRecordEnd = PayRecordDate.split("-")[1];
  
  data.empState = req.body.employeeState.replace(/[-_.]/g, " ").replace(/(\b[a-z](?!\s))/g, function(x){return x.toUpperCase();});

  let SumofAdditions = 0;
  let SumofAdditionsYtd = 0;
  let SumofDeduction = 0;
  let SumofDeductionYtd = 0;

  if (data.additions) {    
    SumofAdditions = data.additions.map(x=>x.currentAmount).reduce((a,b) => parseFloat(a) + parseFloat(b), 0)
    SumofAdditionsYtd = data.additions.map(x=>x.ytdAmount).reduce((a,b) => parseFloat(a) + parseFloat(b), 0)
    data.additiondesc1=data.additions.map(x=>x.description)
    data.additionCurrentAmount1 = data.additions.map(x=>x.currentAmount)
    console.log("add cur amount",data.additionCurrentAmount1)
  }

  if (data.deductions) {    
    SumofDeduction = data.deductions.map(x=>x.currentAmount).reduce((a,b) => parseFloat(a) + parseFloat(b), 0)
    SumofDeductionYtd = data.deductions.map(x=>x.ytdAmount).reduce((a,b) => parseFloat(a) + parseFloat(b), 0)
    data.deductiondesc1=data.deductions.map(x=>x.description)
    data.deductionCurrentAmount1 = data.deductions.map(x=>x.currentAmount)
    console.log("Ded",data.deductionCurrentAmount1)
    data.deductionCurrentAmountYtd1 = data.deductions.map(x=>x.ytdAmount)
  }

  if (req.body.payFrequency == "monthly") {
  
    let regularEarning = hourly? parseFloat(req.body.hourlyRate) * 80 : parseFloat(req.body.salaryAnnual / 12);
    
    console.log("REG ERN ",regularEarning)
    console.log(req.body.payFrequency);
    stateTax = hourly ? stateTax : stateTax/12
    socialSecurityTaxWithHeld = hourly?socialSecurityTaxWithHeld : socialSecurityTaxWithHeld/12;
    MedicareTaxWithHeld = hourly? MedicareTaxWithHeld : MedicareTaxWithHeld/12;
    
    let fedTaxsignlemonth = hourly? fedTax: parseFloat(fedTax / 12);
    let noOfPays = new Date().getMonth() + 1;
    let currentDeduction = parseFloat(fedTaxsignlemonth)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld) + parseFloat(SumofDeduction)
    let ytdDeduction= (parseFloat(fedTaxsignlemonth) * parseFloat(noOfPays))+(parseFloat(stateTax) * parseFloat(noOfPays))+(parseFloat(socialSecurityTaxWithHeld) * parseFloat(noOfPays))+(parseFloat(MedicareTaxWithHeld) * parseFloat(noOfPays)) + parseFloat(SumofDeductionYtd)
    let ytdNetPay = (parseFloat(regularEarning) * parseFloat(noOfPays))+parseFloat(SumofAdditionsYtd) - parseFloat(ytdDeduction);
    data.ftCurrent = formatNumber(fedTaxsignlemonth);
    data.ftYtd = formatNumber(parseFloat(fedTaxsignlemonth) * parseFloat(noOfPays));
    data.ytdGross = formatNumber(((parseFloat(regularEarning) * parseFloat(noOfPays))+parseFloat(SumofAdditionsYtd)));
    data.regularEarning = formatNumber(regularEarning);
    data.ytdDeduction = formatNumber(ytdDeduction);
    data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
    data.currentTotal = formatNumber(parseFloat(regularEarning) + parseFloat(SumofAdditions));
    data.currentDeduction = formatNumber(currentDeduction);
    data.netPay = formatNumber( (parseFloat(regularEarning)+parseFloat(SumofAdditions)) - parseFloat(currentDeduction)); //data.ftYtd;
    data.stateTax = formatNumber(stateTax)
    data.stateTaxytd = formatNumber(parseFloat(stateTax) * parseFloat(noOfPays))
    data.ssCurrent = formatNumber(socialSecurityTaxWithHeld)
    data.ssYtd = formatNumber(parseFloat(socialSecurityTaxWithHeld) *parseFloat( noOfPays))
    data.hitCurrent = formatNumber( MedicareTaxWithHeld)
    data.hitYtd=formatNumber(parseFloat(MedicareTaxWithHeld) * parseFloat(noOfPays))
    
    var p = parseFloat(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)).toFixed(2)
    var n = ( p+ "").split(".")[1];
  
    data.amountInWords = n ? converter.toWords(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords(parseFloat(regularEarning) - parseFloat(currentDeduction));
   
    
  } else if (req.body.payFrequency == "onetime") {
    console.log(req.body.payFrequency);
    console.log(fedTax);
    let fedTaxsingle = parseFloat(fedTax).toFixed(2);
    let currentDeduction= parseFloat(fedTax)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld)+ parseFloat(SumofDeduction)
    let ytdDeduction= parseFloat(fedTax)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld)  + parseFloat(SumofDeductionYtd)
    let regularEarning = hourly? (parseFloat(req.body.hourlyRate) * 80): parseFloat(req.body.salaryAnnual);
    let ytdNetPay =  parseFloat(regularEarning)+parseFloat(SumofAdditionsYtd) - parseFloat(ytdDeduction);
    data.ftCurrent = formatNumber(fedTaxsingle);
    data.ftYtd = formatNumber(fedTaxsingle);
    data.ytdGross = formatNumber(parseFloat(regularEarning)+parseFloat(SumofAdditionsYtd));
    data.regularEarning = formatNumber(regularEarning);
    data.ytdDeduction = formatNumber(ytdDeduction);
    data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
    data.currentTotal = formatNumber(parseFloat(regularEarning) + parseFloat(SumofAdditions));
    data.currentDeduction = formatNumber(currentDeduction);
    data.netPay = currencyFormat((parseFloat(regularEarning)+parseFloat(SumofAdditions)) - parseFloat(currentDeduction));
    data.stateTax= formatNumber(stateTax)
    data.stateTaxytd=data.stateTax
    data.ssCurrent=formatNumber(socialSecurityTaxWithHeld)
    data.ssYtd=formatNumber(socialSecurityTaxWithHeld)
    data.hitCurrent=formatNumber(MedicareTaxWithHeld)
    data.hitYtd=formatNumber(MedicareTaxWithHeld)
    var p = parseFloat(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)).toFixed(2)
    var n = ( p+ "").split(".")[1];
  
    data.amountInWords = n ? converter.toWords(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords(parseFloat(regularEarning) - parseFloat(currentDeduction));
   
  } else if (req.body.payFrequency == "annually") {
    console.log(req.body.payFrequency);
    console.log(fedTax);
    let fedTaxsingle = parseFloat(fedTax).toFixed(2);
    let currentDeduction= parseFloat(fedTax)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld)+ parseFloat(SumofDeduction)
    let ytdDeduction= parseFloat(fedTax)+ parseFloat(stateTax) + parseFloat(socialSecurityTaxWithHeld) + parseFloat(MedicareTaxWithHeld)  + parseFloat(SumofDeductionYtd)
    let regularEarning = hourly? (parseFloat(req.body.hourlyRate) * 80): parseFloat(req.body.salaryAnnual);
    let ytdNetPay = parseFloat(regularEarning) + parseFloat(SumofAdditionsYtd) - parseFloat(ytdDeduction);
    data.ftCurrent = formatNumber(fedTaxsingle);
    data.ftYtd = formatNumber(fedTaxsingle);
    data.ytdGross = formatNumber(parseFloat(regularEarning) + parseFloat(SumofAdditionsYtd));
    data.regularEarning = formatNumber(regularEarning);
    data.ytdDeduction = formatNumber(ytdDeduction);
    data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
    data.currentTotal = formatNumber(parseFloat(regularEarning) + parseFloat(SumofAdditions));
    data.currentDeduction = formatNumber(currentDeduction);
    data.netPay = currencyFormat((parseFloat(regularEarning) + parseFloat(SumofAdditions)) - parseFloat(currentDeduction));
    data.stateTax= formatNumber(stateTax)
    data.stateTaxytd=data.stateTax
    data.ssCurrent=formatNumber(socialSecurityTaxWithHeld)
    data.ssYtd=formatNumber(socialSecurityTaxWithHeld)
    data.hitCurrent=formatNumber(MedicareTaxWithHeld)
    data.hitYtd=formatNumber(MedicareTaxWithHeld)
    var p = parseFloat(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)).toFixed(2)
    var n = ( p+ "").split(".")[1];
  
    data.amountInWords = n ? converter.toWords(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords(parseFloat(regularEarning) - parseFloat(currentDeduction));
   
  } else if (req.body.payFrequency == "daily") {
    //this should be fiorst month of year
    var d = new Date(new Date().getFullYear(), 0, 1);
    var date1 = new Date(req.body.payDate);
    // get total seconds between two dates
    var res = Math.abs(date1 - d) / 1000;
    var noOfPays = Math.floor(res / 86400);
    console.log("No of pays", noOfPays);
    console.log(req.body.payFrequency);
    console.log("WPD",req.body.Worked_Per_Pay)
    let regularEarning = hourly? (parseFloat(req.body.hourlyRate) * 80 ) :parseFloat(req.body.salaryAnnual / 12 / 30);
    console.log("FED",fedTax)
    fedTaxsingle = hourly? fedTax: parseFloat(fedTax / 12 / 30).toFixed(2);
    stateTax= hourly? stateTax: stateTax/12/30
    socialSecurityTaxWithHeld =  hourly? socialSecurityTaxWithHeld:(socialSecurityTaxWithHeld/12)/30
    MedicareTaxWithHeld= hourly? MedicareTaxWithHeld:((MedicareTaxWithHeld/12)/30)
    let currentDeduction= (parseFloat(fedTaxsingle)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld)) + parseFloat(SumofDeduction)
  
    let ytdDeduction= (parseFloat(fedTaxsingle) * parseFloat(noOfPays))+(parseFloat(stateTax) * parseFloat(noOfPays))+(parseFloat(socialSecurityTaxWithHeld) * parseFloat(noOfPays))+(parseFloat(MedicareTaxWithHeld) * parseFloat(noOfPays)) + parseFloat(SumofDeductionYtd)
    let ytdNetPay =(parseFloat(regularEarning) * parseFloat(noOfPays) + parseFloat(SumofAdditionsYtd)) - parseFloat(ytdDeduction);
    data.ftCurrent = formatNumber(fedTaxsingle);
    data.ftYtd = formatNumber(parseFloat(fedTaxsingle * noOfPays).toFixed(2));
    data.ytdGross = formatNumber((parseFloat(regularEarning) * parseFloat(noOfPays)) + parseFloat(SumofAdditionsYtd));
    data.regularEarning = formatNumber(regularEarning);
    data.ytdDeduction = formatNumber( ytdDeduction);
    data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
    data.currentTotal = formatNumber(parseFloat(regularEarning) + parseFloat(SumofAdditions) );
    data.currentDeduction =formatNumber(currentDeduction);
    data.netPay = currencyFormat(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction));
    data.stateTax= formatNumber(stateTax) 
    data.stateTaxytd=formatNumber(parseFloat(stateTax) * parseFloat(noOfPays))
    data.ssCurrent=formatNumber(socialSecurityTaxWithHeld )
    data.ssYtd=formatNumber((parseFloat(socialSecurityTaxWithHeld) * parseFloat(noOfPays)))
    data.hitCurrent=formatNumber(MedicareTaxWithHeld)
    data.hitYtd=formatNumber(parseFloat(MedicareTaxWithHeld) * parseFloat(noOfPays))
    var p = parseFloat(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)).toFixed(2)
    var n = ( p+ "").split(".")[1];
    data.amountInWords = n ? converter.toWords(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords(parseFloat(regularEarning) - parseFloat(currentDeduction));
    
  } else if (req.body.payFrequency == "semimonthly") {
    console.log(req.body.payFrequency);

    let dateStarted = new Date(req.body.payDate);
    var noOfPays = getNumberOfsemimonth(dateStarted);
    let regularEarning = hourly? (parseFloat(req.body.hourlyRate) * 80) :parseFloat(req.body.salaryAnnual / 12 / 2).toFixed(2)
    // let regularEarning = parseFloat(req.body.salaryAnnual / 12 / 2).toFixed(2);
    let fedTaxsignlemonth = parseFloat(fedTax / 12 / 2);
    socialSecurityTaxWithHeld= hourly? socialSecurityTaxWithHeld:((socialSecurityTaxWithHeld/12)/2)
    MedicareTaxWithHeld= hourly? MedicareTaxWithHeld:((MedicareTaxWithHeld/12)/2)
    stateTax=((stateTax/12)/2)
    
    console.log("No of pays", noOfPays);
    let currentDeduction= (parseFloat(fedTaxsignlemonth) + parseFloat(stateTax) + parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld))+ parseFloat(SumofDeduction)
  
    let ytdDeduction= (parseFloat(fedTaxsignlemonth) * parseFloat(noOfPays))+(parseFloat(stateTax) * parseFloat(noOfPays))+(parseFloat(socialSecurityTaxWithHeld) * parseFloat(noOfPays))+(parseFloat(MedicareTaxWithHeld) * parseFloat(noOfPays)) + parseFloat(SumofDeductionYtd)
    
    let ytdNetPay = (parseFloat(regularEarning) * parseFloat(noOfPays)) + parseFloat(SumofAdditionsYtd) - parseFloat(ytdDeduction);
    data.ftCurrent = formatNumber(fedTaxsignlemonth);
    data.ftYtd = formatNumber(parseFloat(fedTaxsignlemonth) * parseFloat(noOfPays));
    data.ytdGross = formatNumber((parseFloat(regularEarning) * parseFloat(noOfPays)) + parseFloat(SumofAdditionsYtd));
    data.regularEarning = formatNumber(regularEarning);
    data.ytdDeduction = formatNumber(ytdDeduction);
    data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
    
    data.currentTotal = formatNumber(parseInt( regularEarning ) + parseInt( SumofAdditions ));
    // data.currentTotal = formatNumber(regularEarning + parseFloat( SumofAdditions).toFixed(2));
    data.currentDeduction = formatNumber(currentDeduction);
    data.netPay = currencyFormat((parseInt(regularEarning) + parseInt(SumofAdditions)) - parseFloat(currentDeduction));
    data.stateTax= formatNumber(stateTax)
    data.stateTaxytd=formatNumber(parseFloat(stateTax) * parseFloat(noOfPays))
    data.ssCurrent=  formatNumber(socialSecurityTaxWithHeld)
    data.ssYtd= formatNumber(parseFloat(socialSecurityTaxWithHeld) * parseFloat(noOfPays))
    data.hitCurrent= formatNumber(MedicareTaxWithHeld)
    data.hitYtd= formatNumber(parseFloat(MedicareTaxWithHeld) * parseFloat(noOfPays))
    var p = parseFloat(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)).toFixed(2)
    var n = ( p+ "").split(".")[1];
    data.amountInWords = n ? converter.toWords(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords(parseFloat(regularEarning) - parseFloat(currentDeduction));
   
  } else if (req.body.payFrequency == "weekly") {
    console.log(req.body.payFrequency);

    let dateStarted = new Date(req.body.payDate);
    var noOfPays = getNumberOfWeek();
    console.log("days of ", noOfPays);

    let regularEarning = hourly? ((parseFloat(req.body.hourlyRate) * 80) ) : parseFloat((req.body.salaryAnnual / 52) )
    console.log("regularEarning",regularEarning)
    // let regularEarning = parseFloat((monthlysalary / 30) * 7).toFixed(2);
    
    let fedTaxsignlemonth = parseFloat(fedTax / 52);
    stateTax=(stateTax/52)
    socialSecurityTaxWithHeld= hourly?socialSecurityTaxWithHeld: (socialSecurityTaxWithHeld/52)
    MedicareTaxWithHeld= hourly? MedicareTaxWithHeld: (MedicareTaxWithHeld/52)
    let currentDeduction= (parseFloat(fedTaxsignlemonth)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld)) + parseFloat( SumofDeduction)
  
    let ytdDeduction= (parseFloat(fedTaxsignlemonth) * parseFloat(noOfPays)) + (parseFloat(stateTax) * parseFloat(noOfPays)) + (parseFloat(socialSecurityTaxWithHeld) * parseFloat(noOfPays)) + (parseFloat(MedicareTaxWithHeld) * parseFloat(noOfPays)) + parseFloat(SumofDeductionYtd)
    
    console.log("No of pays", noOfPays);
    let ytdNetPay =(parseFloat(regularEarning) * parseFloat(noOfPays)) + parseFloat(SumofAdditionsYtd) - parseFloat(ytdDeduction);
    data.ftCurrent = formatNumber(fedTaxsignlemonth);
    data.ftYtd = formatNumber((parseFloat(fedTaxsignlemonth) * parseFloat( noOfPays)));
    data.ytdGross = formatNumber((parseFloat(regularEarning) * parseFloat(noOfPays)) + parseFloat(SumofAdditionsYtd));
    data.regularEarning = formatNumber(regularEarning);
    data.ytdDeduction = formatNumber(ytdDeduction);
    data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
    data.currentTotal = formatNumber(parseFloat(regularEarning) + parseFloat(SumofAdditions));
    data.currentDeduction = formatNumber(currentDeduction);
    data.netPay = currencyFormat((parseFloat(regularEarning) + parseFloat(SumofAdditions))  - parseFloat(currentDeduction));
    data.stateTax= formatNumber(stateTax)
    data.stateTaxytd= formatNumber((parseFloat(stateTax) * parseFloat(noOfPays)))
    data.ssCurrent= formatNumber(socialSecurityTaxWithHeld)
    data.ssYtd= formatNumber((parseFloat(socialSecurityTaxWithHeld) * parseFloat(noOfPays)))
    data.hitCurrent= formatNumber(MedicareTaxWithHeld)
    data.hitYtd= formatNumber((parseFloat(MedicareTaxWithHeld) * parseFloat(noOfPays)))
    var p = parseFloat(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)).toFixed(2)
    var n = ( p+ "").split(".")[1];
  
    data.amountInWords = n ? converter.toWords(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords(parseFloat(regularEarning) - parseFloat(currentDeduction));
   
  } else if (req.body.payFrequency == "biweekly") {
    console.log(req.body.payFrequency);
     var noOfPays = parseInt ( getNumberOfWeek() / 2 );
    console.log("days of ", noOfPays);
   let regularEarning = hourly? ((parseFloat(req.body.hourlyRate) * 80) ) : parseFloat( req.body.salaryAnnual  / 26)
   let fedTaxsignlemonth = parseFloat(fedTax / 26) ;
   stateTax=(stateTax /26)
   socialSecurityTaxWithHeld= hourly?socialSecurityTaxWithHeld: (socialSecurityTaxWithHeld /26)
    MedicareTaxWithHeld= hourly?  MedicareTaxWithHeld:MedicareTaxWithHeld/26
    let currentDeduction = (parseFloat(fedTaxsignlemonth)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld)) + parseFloat(SumofDeduction)
    let ytdDeduction= (parseFloat(fedTaxsignlemonth) * parseFloat(noOfPays)) + (parseFloat(stateTax) * parseFloat(noOfPays)) + (parseFloat(socialSecurityTaxWithHeld) * parseFloat(noOfPays)) + (parseFloat(MedicareTaxWithHeld) * parseFloat(noOfPays)) + parseFloat(SumofDeductionYtd)
    console.log("No of pays", noOfPays);
    let ytdNetPay = (parseFloat(regularEarning) * parseFloat(noOfPays)) + parseFloat(SumofAdditionsYtd) - parseFloat(ytdDeduction);
    data.ftCurrent = formatNumber(fedTaxsignlemonth);
    data.ftYtd = formatNumber((parseFloat(fedTaxsignlemonth) * parseFloat(noOfPays)));
    data.ytdGross = formatNumber(((parseFloat(regularEarning) * parseFloat(noOfPays)) + parseFloat(SumofAdditionsYtd)));
    data.regularEarning = formatNumber(regularEarning);
    data.ytdDeduction = formatNumber(ytdDeduction);
    data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
    data.currentTotal = formatNumber(parseFloat(regularEarning) + parseFloat(SumofAdditions));
    data.currentDeduction = formatNumber(currentDeduction);
    data.netPay = currencyFormat((parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)));
    data.stateTax=  formatNumber(stateTax)
    data.stateTaxytd= formatNumber(parseFloat(stateTax) * parseFloat(noOfPays))
    data.ssCurrent=    formatNumber(socialSecurityTaxWithHeld)
    data.ssYtd= formatNumber((parseFloat(socialSecurityTaxWithHeld) * parseFloat(noOfPays)))
    data.hitCurrent=   formatNumber(MedicareTaxWithHeld)
    data.hitYtd= formatNumber(parseFloat(MedicareTaxWithHeld) * parseFloat(noOfPays))
    var p = parseFloat(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)).toFixed(2)
    var n = ( p+ "").split(".")[1];
  
    data.amountInWords = n ? converter.toWords(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords(parseFloat(regularEarning) - parseFloat(currentDeduction));
   
  } else if (req.body.payFrequency == "quarterly") {
    console.log(req.body.payFrequency);
    
    let regularEarning = hourly? (((parseFloat(req.body.hourlyRate) * 80) )  ) :  parseFloat(req.body.salaryAnnual / 4)
    // let regularEarning = parseFloat(req.body.salaryAnnual / 4).toFixed(2);
    let fedTaxsignlemonth = parseFloat(fedTax / 4);
    var dt = new Date(req.body.payDate);
    let noOfPays = getNumberOfQuatar(dt);
    stateTax=stateTax/4
    socialSecurityTaxWithHeld= hourly? socialSecurityTaxWithHeld: socialSecurityTaxWithHeld/4
    MedicareTaxWithHeld= hourly? MedicareTaxWithHeld: MedicareTaxWithHeld/4
    let currentDeduction= (parseFloat(fedTaxsignlemonth)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld)) + parseFloat(SumofDeduction)
    let ytdDeduction= (parseFloat(fedTaxsignlemonth) * parseFloat(noOfPays)) + (parseFloat(stateTax) * parseFloat(noOfPays)) + (parseFloat(socialSecurityTaxWithHeld) * parseFloat(noOfPays)) + (parseFloat(MedicareTaxWithHeld) * parseFloat(noOfPays)) + parseFloat(SumofDeductionYtd)
   
    console.log("no of pays", noOfPays);
    let ytdNetPay = (parseFloat(regularEarning) * parseFloat(noOfPays))+ parseFloat(SumofAdditionsYtd) - parseFloat(ytdDeduction);
    data.ftCurrent = formatNumber(fedTaxsignlemonth);
    data.ftYtd = formatNumber(parseFloat(fedTaxsignlemonth) * parseFloat(noOfPays));
    data.ytdGross = formatNumber(((parseFloat(regularEarning) * parseFloat(noOfPays)) + parseFloat(SumofAdditionsYtd)));
    data.regularEarning = formatNumber(regularEarning);
    data.ytdDeduction = formatNumber(ytdDeduction);
    data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
    data.currentTotal = formatNumber(parseFloat(regularEarning) + parseFloat(SumofAdditions));
    data.currentDeduction = formatNumber(currentDeduction);
    data.netPay = currencyFormat(((parseFloat(regularEarning) + parseFloat(SumofAdditions)) - parseFloat(currentDeduction)));
    data.stateTax= formatNumber (stateTax)
    data.stateTaxytd= formatNumber ((parseFloat(stateTax) * parseFloat(noOfPays)))
    data.ssCurrent=  formatNumber (socialSecurityTaxWithHeld)
    data.ssYtd=  formatNumber (parseFloat(socialSecurityTaxWithHeld) * parseFloat(noOfPays))
    data.hitCurrent=  formatNumber (MedicareTaxWithHeld)
    data.hitYtd=  formatNumber (parseFloat(MedicareTaxWithHeld) * parseFloat(noOfPays))
    var p = parseFloat(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)).toFixed(2)
    var n = ( p+ "").split(".")[1];
  
    data.amountInWords = n ? converter.toWords(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords(parseFloat(regularEarning) - parseFloat(currentDeduction));
   
  } else if (req.body.payFrequency == "semiannually") {
    console.log(req.body.payFrequency);
    var dt = new Date(req.body.payDate);
    let noOfPays = getNumberOfSemiAnnual(dt);
    let fedTaxsignlemonth = parseFloat(fedTax / 2);
    stateTax = stateTax/2;
    socialSecurityTaxWithHeld = hourly ? socialSecurityTaxWithHeld : socialSecurityTaxWithHeld/2;
    MedicareTaxWithHeld = hourly ? MedicareTaxWithHeld : MedicareTaxWithHeld/2;
    console.log("noOfPays", noOfPays);
    let currentDeduction = (parseFloat(fedTaxsignlemonth)+parseFloat(stateTax)+parseFloat(socialSecurityTaxWithHeld)+parseFloat(MedicareTaxWithHeld)) + parseFloat(SumofDeduction);
    let ytdDeduction = (parseFloat(fedTaxsignlemonth) * parseFloat(noOfPays)) + (parseFloat(stateTax) * parseFloat(noOfPays)) + (parseFloat(socialSecurityTaxWithHeld) * parseFloat(noOfPays)) + (parseFloat(MedicareTaxWithHeld) * parseFloat(noOfPays) +parseFloat( SumofDeductionYtd));
    let regularEarning = hourly? (parseFloat(req.body.hourlyRate) * 80): parseFloat(req.body.salaryAnnual / 2);
    // let regularEarning = parseFloat(req.body.salaryAnnual / 2).toFixed(2);
    let ytdNetPay = (parseFloat(regularEarning) * parseFloat(noOfPays)) + parseFloat(SumofAdditionsYtd) - parseFloat(ytdDeduction);
    data.ftCurrent = formatNumber(fedTaxsignlemonth);
    data.ftYtd = formatNumber(parseFloat(fedTaxsignlemonth) * parseFloat(noOfPays));
    data.ytdGross = formatNumber((parseFloat(regularEarning) * parseFloat(noOfPays)) + parseFloat(SumofAdditionsYtd));
    data.regularEarning = formatNumber(regularEarning);
    data.ytdDeduction = formatNumber(ytdDeduction);
    data.ytdNetPay = currencyFormat(ytdNetPay); //   "$" + formatNumber(ytdNetPay);
    data.currentTotal = formatNumber(parseFloat(regularEarning) + parseFloat(SumofAdditions));
    data.currentDeduction = formatNumber(currentDeduction);
    data.netPay = currencyFormat((parseFloat(regularEarning) + parseFloat(SumofAdditions))- parseFloat(currentDeduction));
    data.stateTax= formatNumber(stateTax)
    data.stateTaxytd= formatNumber(parseFloat(stateTax) * parseFloat(noOfPays))
    data.ssCurrent=  formatNumber(socialSecurityTaxWithHeld)
    data.ssYtd=  formatNumber(parseFloat(socialSecurityTaxWithHeld) * parseFloat(noOfPays))
    data.hitCurrent= formatNumber(MedicareTaxWithHeld)
    data.hitYtd=  formatNumber(parseFloat(MedicareTaxWithHeld) * parseFloat(noOfPays))
    var p = parseFloat(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)).toFixed(2)
    var n = ( p+ "").split(".")[1];
    data.amountInWords = n ? converter.toWords(parseFloat(regularEarning) + parseFloat(SumofAdditions) - parseFloat(currentDeduction)) +' And '+ converter.toWords(n)+ ' Cents' :converter.toWords(parseFloat(regularEarning) - parseFloat(currentDeduction));
   
  }

  if( req.body.showHourlyRate && req.body.hourlyRate == '' ) {
    let regular = data.regularEarning;
    regular = parseInt(regular.replace(/,/g, ''));
    data.hours = req.body.hourlyRatePerPayPeriod;
    data.rates = (regular / data.hours).toFixed(2);
  } else if( req.body.hourlyRate != '' ) {
    data.hours = 80;
    data.rates = req.body.hourlyRate;
  }
  
  data.showhidestate = (stateTax > 0) ? true : false;
  data.showhidsdi = (data.sdiCurrent > 0) ? true : false;

  return data;
}

function GetStateTax(state, martialStatus, year, salary) {
  
  // let state='california'
  // let martialStatus='single'
  const y2020 = Taxee.default[year];

  let data;//= y2020[state][martialStatus]['income_tax_brackets'];
  console.log(y2020[state][martialStatus]);
  if (y2020[state] && y2020[state][martialStatus]['income_tax_brackets']) {
    data = y2020[state][martialStatus]['income_tax_brackets'];
  } else { data = [] }

  // let salary = 60000// parseInt(req.body.annualSalary);
  
  let salarycl = salary// parseInt(req.body.annualSalary);
 
  let bracketSalary = [];
  let mariganlRate = [];
  let bracket;
  let state_Tax = 0;

  for (let index = 0; index < data.length; index++) {
    // const element = single[index];
    if (data[index].bracket >= 0) {
      bracket =
        salarycl - data[index].bracket - 1 > 0
          ? salarycl - data[index].bracket - 1
          : console.log("");

      if (bracket && salary - data[index].bracket > 0) {
        mariganlRate.push(data[index].marginal_rate);
        bracketSalary.push(salary - data[index].bracket);
      }
    }
  }

  bracketSalary.push(0);
  let calcarray = [];

  for (let index = 0; index < bracketSalary.length; index++) {
    const element = bracketSalary[index];
    const marginalRate = mariganlRate[index];
    if (marginalRate && element > 0) {
      calcarray.push(bracketSalary[index] - (bracketSalary[index + 1] - 1));
    }
  }

  for (let index = 0; index < calcarray.length; index++) {
    const element = (calcarray[index] / 100) * mariganlRate[index];
    state_Tax += element;
  }
  console.log("----------state_Tax", state_Tax);

  return state_Tax

}

function GetFederalTax(employeeMaritalStatus,salary) {
  const year = 2020; // req.params.year;
  const federal = Taxee.default[year];
  let taxFederal = federal["federal"];
  let single =
    federal["federal"].tax_withholding_percentage_method_tables.annual[
      "single"
    ].income_tax_brackets;
  let married =
    federal["federal"].tax_withholding_percentage_method_tables.annual[
      "married"
    ].income_tax_brackets;
  let married_separately =
    federal["federal"].tax_withholding_percentage_method_tables.annual[
      "married_separately"
    ].income_tax_brackets;
  let head_of_household =
    federal["federal"].tax_withholding_percentage_method_tables.annual[
      "head_of_household"
    ].income_tax_brackets;

  
  let salarycl =salary 
  console.log("Annual salary for hourly and annual input",salary)

  let bracketSalary = [];
  let mariganlRate = [];
  let bracket;
  let fedTax = 0;

  for (let index = 0; index < single.length; index++) {
    if (employeeMaritalStatus == "single" || employeeMaritalStatus == "dontKnow") {
      // const element = single[index];
      console.log("Single");
      if (single[index].bracket >= 0) {
        bracket =
          salarycl - single[index].bracket - 1 > 0
            ? salarycl - single[index].bracket - 1
            : console.log("");

        if (bracket && salary - single[index].bracket > 0) {
          mariganlRate.push(single[index].marginal_rate);
          bracketSalary.push(salary - single[index].bracket);
        }
      }
    } else if (employeeMaritalStatus == "married") {
      // const element = single[index];
      console.log("Married");
      if (married[index].bracket >= 0) {
        bracket =
          salarycl - married[index].bracket - 1 > 0
            ? salarycl - married[index].bracket - 1
            : console.log("");

        if (bracket && salary - married[index].bracket > 0) {
          mariganlRate.push(married[index].marginal_rate);
          bracketSalary.push(salary - married[index].bracket);
        }
      }
    }  else if (employeeMaritalStatus == "head") {
      console.log("Head");
      if (head_of_household[index].bracket >= 0) {
        bracket =
          salarycl - head_of_household[index].bracket - 1 > 0
            ? salarycl - head_of_household[index].bracket - 1
            : console.log("");

        if (bracket && salary - head_of_household[index].bracket > 0) {
          mariganlRate.push(head_of_household[index].marginal_rate);
          bracketSalary.push(salary - head_of_household[index].bracket);
        }
      }
    } else {
      // const element = single[index];
      console.log("Single");
      if (single[index].bracket >= 0) {
        bracket =
          salarycl - single[index].bracket - 1 > 0
            ? salarycl - single[index].bracket - 1
            : console.log("");

        if (bracket && salary - single[index].bracket > 0) {
          mariganlRate.push(single[index].marginal_rate);
          bracketSalary.push(salary - single[index].bracket);
        }
      }
    }
  }
  
  bracketSalary.push(0);
  let calcarray = [];

  for (let index = 0; index < bracketSalary.length; index++) {
    const element = bracketSalary[index];
    const marginalRate = mariganlRate[index];
    if (marginalRate && element > 0) {
      calcarray.push(
        bracketSalary[index] - (bracketSalary[index + 1] - 1)
      );
    }
  }
  
  for (let index = 0; index < calcarray.length; index++) {
    const element = (calcarray[index] / 100) * mariganlRate[index];
    fedTax += element;
  }

  return fedTax;
}

function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function getNumberOfWeek() {
  const today = new Date();
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
  const pastDaysOfYear = (today - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() ) / 7);
}

function getNumberOfsemimonth(today) {
  //const today = new Date();
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
  const pastDaysOfYear = (today - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() ) / 15);
}

function getNumberOfQuatar(today) {
  //const today = new Date();
  // const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
  // const pastDaysOfYear = (today - firstDayOfYear) / 86400000;
  // return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 90);
  // var date = new Date();    
 var firstday = new Date(today.getFullYear(),0,1); // XXXX/01/01
 var diff = Math.ceil((today - firstday) / 86400000); 
 // a quarter is about 365/4 
 quarter =  parseInt( diff / ( 365/ 4 )) + 1 

 return quarter;
}

function getNumberOfSemiAnnual(today) {
  //const today = new Date();
  // const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
  // const pastDaysOfYear = (today - firstDayOfYear) / 86400000;
  // return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 90);
  // var date = new Date();    
 var firstday = new Date(today.getFullYear(),0,1); // XXXX/01/01
 var diff = Math.ceil((today - firstday) / 86400000); 
 // a quarter is about 365/4 
 quarter =  parseInt( diff / ( 365/ 2 )) + 1 

 return quarter;
}

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

function getW2Template( key ) {
  const templates = {
      'a': 'w2-template-A.html',
      'b': 'w2-template-B.html',
      'c': 'w2-template-C.html',
      'd': 'w2-template-D.html',
      'e': 'w2-template-E.html',
      'f': 'w2-template-F.html'
  }
  
  if( templates[key] ) {
    return templates[key]
  } 
  
  return 'w2-template-A.html';
}

function formatNumber(num) {
  return parseFloat(num).toFixed(2).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}

function currencyFormat(num) {
  return '$' + num.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

function formatMMDDYYYY (dt){
  return (new Date(dt)).toLocaleDateString('en-US', { 
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function payRecord( dt, payFrequency ) {

  var dt2 = new Date(dt)
  dt = new Date(dt)
  
  if (payFrequency == "monthly") {     
    dt.setDate(dt.getDate() - 3);
    dt2.setDate(dt2.getDate() - 2);    
    dt2.setDate(dt2.getDate() - 30);    
  } else if (payFrequency == "onetime") {
    dt.setDate(dt.getDate() - 3);
    dt2.setDate(dt2.getDate() - 1);
  } else if (payFrequency == "annually") {
    dt.setDate(dt.getDate() - 3);
    dt2.setDate(dt2.getDate() + 4);
    dt2.setFullYear(dt2.getFullYear()-1)  
  } else if (payFrequency == "daily") {
    dt.setDate(dt.getDate() - 3);
    dt2.setDate(dt2.getDate() - 3); 
  } else if (payFrequency == "semimonthly") {
    dt.setDate(dt.getDate() - 3);
    dt2.setDate(dt2.getDate() - 2);    
    dt2.setDate(dt2.getDate() - 15);
  } else if (payFrequency == "weekly") {
    dt.setDate(dt.getDate() - 3);
    dt2.setDate(dt2.getDate() - 2);    
    dt2.setDate(dt2.getDate() - 7);
  } else if (payFrequency == "biweekly") {    
    dt.setDate(dt.getDate() - 3);
    // dt2.setDate(dt2.getDate() - 2);    
    dt2.setDate(dt2.getDate() - 16);
  } else if (payFrequency == "quarterly") {
    dt.setDate(dt.getDate() - 3);
    dt2.setDate(dt2.getDate() - 2);    
    dt2.setDate(dt2.getDate() - 90);
  } else if (payFrequency == "semiannually") {
    dt.setDate(dt.getDate() - 3);
    dt2.setDate(dt2.getDate() - 2);    
    dt2.setDate(dt2.getDate() - 180);
  } else  {
    dt.setDate(dt.getDate() - 3);
    dt2.setDate(dt2.getDate() + 4);
    dt2.setFullYear(dt2.getFullYear()-1)  
  }

  var finalDate = new Date( (dt2.getMonth()+1) +'/'+ dt2.getDate()+'/'+dt2.getFullYear());

  var date1 = finalDate.toLocaleDateString("en-GB", { // you can skip the first argument
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  var date2 = dt.toLocaleDateString("en-GB", { // you can skip the first argument
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return date1 + " - " + date2;   
}