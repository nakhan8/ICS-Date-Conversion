/*********************************************************************/
// Javascript (node.js) for the implementation
/*********************************************************************/


/* node.js code to calendar integrations with SnapHabit
 */

const { writeFileSync } = require('fs')
const express = require('express')
const path = require('path')
const fileUpload = require('express-fileupload')
const ical = require('node-ical');
//const ics = require('ics')
const ical_w = require('ical-generator');
var moment = require('moment');
const { start } = require('repl');

const app = express()
app.use(fileUpload());

// set static folder
app.use(express.static(path.join(__dirname, 'public')))

app.post('/submit-form', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  var filename = req.files.document.name
  //console.log( req.files.document.name); // the uploaded file object
  var start_date = moment(req.body.startDate)
  start_date.utcOffset( start_date.utcOffset() )
  start_date.format()

  console.log("now " +   start_date.format()    )

  //const events = ical.sync.parseFile('JusticeJune.ics');
  const events = ical.sync.parseICS(req.files.document.data.toString() );


  var dates = []; 
  for (const event of Object.values(events)) {
      if(event.start)
        dates.push(new Date(event.start )); 
  };

  var minimumDate = dates[0]

  for(i = 1; i<dates.length; i++){
    if(minimumDate.getTime() > dates[i].getTime()){
      //console.log( "min date" + dates[i])
      minimumDate = dates[i]
    }
  }

  minimumDate = moment(minimumDate)
  minimumDate.utcOffset( minimumDate.utcOffset() )
  console.log( "mini day " + minimumDate.format() )
 
  var m = minimumDate.hour(0).minute(0)
  var s = start_date.hour(0).minute(0)
 
  //var Difference_In_Days = s.getDate() - m.getDate()
  var Difference_In_Days = s.diff(m, "days", true)
  console.log( "diff days " + Difference_In_Days)  

  for (const event of Object.values(events)) {
      if(event.start && event.end){
        
        if (event.start.dateOnly )
          event["allDay"] = true
        
        event.start = moment(event.start)
        event.start.utcOffset( event.start.utcOffset() )
        event.end = moment(event.end)
        event.end.utcOffset( event.end.utcOffset() )
        
        if(Difference_In_Days >= 0){
          event.start = event.start.add(Difference_In_Days, "days").format()
          event.start.dateOnly = true
          event.end = event.end.add(Difference_In_Days, "days").format() 
        }else{
          event.start = event.start.subtract(Difference_In_Days, "days").format() 
          event.start.dateOnly = true
          event.end = event.end.subtract(Difference_In_Days, "days").format() 
        }

        // console.log("new " + event.start )
        // console.log("==========================")
      }
 
  };
  
  var event_list = [];
  var repeat_event_list = []
  var no_event = []
  for (const event of Object.values(events)) { 

    if(event.type === 'VEVENT'){
      if (event.rrule){
        repeat_event_list.push(event)
      }else{
        event_list.push(event) 
      }  
    }else{
      no_event.push(event)
    }
  }


  const cal  = ical_w()

  cal.timezone(no_event[0])
  cal.events(event_list)
  console.log(no_event);
 

  for(i = 0; i < repeat_event_list.length; i++){
    //repeat_event_list[i].rrule.options.dtstart = repeat_event_list[i].start
    var freq = repeat_event_list[i].rrule.options.freq
    if( freq == 1 ) 
      freq = "DAILY"
    else if( freq == 2)
      freq = "WEEKLY"
    else if( freq == 3)
      freq = "YEARLY"
    else 
      freq = ""
    
    if(freq)
      cal.createEvent(repeat_event_list[i]).repeating({freq: freq })// required
  }
  
  console.log("==================")
  // console.log( event_list[2]  )


  writeFileSync(`${__dirname}/testCalendar.ics`, cal.toString(), (err) => {
    if (err) return console.log(err);
    console.log('ics is saved');
  });

  res.download('./testCalendar.ics', `${filename}`, (err) => {
    if (err) {
      console.log("download error")
      console.log(err)
      return
    } else {
      console.log("File is sent")
      //res.send('File uploaded!');
    }
  })

})


const PORT = process.env.PORT || 8008
app.listen(PORT, ()=> console.log(`Server started on port ${PORT}`));