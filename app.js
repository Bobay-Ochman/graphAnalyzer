var app = angular.module("app", []);

app.directive("drawing", function(){
  return {
    restrict: "A",
    link: function(scope, element){
      var ctx = element[0].getContext('2d');
      
      var polyPoints = [];
      var canWidth = 500;
      var canHeight = 300;
      var boarder = 25;
      var maxRM = 0;
      var maxSize = 0;
      var dataPoints = []
      var allStrains = new Set([]);

      var justTested = false;


      function handleFileSelect(evt) {
        var files = evt.target.files; // FileList object

        // Loop through the FileList and render image files as thumbnails.
        for (var i = 0, f; f = files[i]; i++) {
          var reader = new FileReader();

          // Closure to capture the file information.
          reader.onload = (function(theFile) {
            return function(e) {
              var client = new XMLHttpRequest();
              client.open('GET', e.target.result);
              client.onreadystatechange = function() {
                loadRMFile(client.responseText);
              }
              client.send();
            };
          })(f);
          reader.readAsDataURL(f);
        }
      }

      document.getElementById('testMe').onclick = testArea;
      document.getElementById('makeMeSmall').onclick = makeSmall;
      document.getElementById('makeMeMed').onclick = makeMid;
      document.getElementById('makeMeBig').onclick = makeBig;
      document.getElementById('resetArea').onclick = resetPoly;
      document.getElementById('files').addEventListener('change', handleFileSelect, false);
      var canvasElement = document.getElementById("canvas");

      canvasElement.width = 500;
      canvasElement.height = 300;

      drawCanvas()


      element.bind('mousedown', function(event){
        if(justTested){
          polyPoints = [];
          drawCanvas()
          justTested = false
        }
        if(event.offsetX!==undefined){
          var point = {}
          point.x = event.offsetX;
          point.y = event.offsetY;
          polyPoints.push(point)
          drawPolyThing()
        }
      });
      element.bind('mousemove', function(event){

      });
      element.bind('mouseup', function(event){
        // stop drawing
      });
      
      function drawPolyThing(){
        if(polyPoints.length > 1){
          ctx.beginPath();
          ctx.moveTo(polyPoints[0].x,polyPoints[0].y);
          for(i = 1; i < polyPoints.length; i++){
            ctx.lineTo(polyPoints[i].x,polyPoints[i].y);
            ctx.stroke();
          }          
        }
      }

      function loadRMFile(rmText){
        dataPoints = []
        polyPoints = []
        maxSize = 0
        maxRM = 0
        allStrains = new Set([]);
        var entries = rmText.split('\n')
        for (i = 0; i < entries.length; i++) { 
          dataPoint = entries[i].split('\t')
          listOfStrains = dataPoint[0].split('&&&')
          x = listOfStrains.length * 3
          y = 250 - dataPoint[3]*100 
          var data = {}
          data.strains = listOfStrains
          for(var j = 0; j < listOfStrains.length; j++){
            allStrains.add(listOfStrains[j])
          }
          data.rm = parseFloat(dataPoint[3])
          if(data.strains.length > maxSize){
            maxSize = data.strains.length
          }
          dataPoints.push(data)
          if(data.rm > maxRM){
            maxRM = data.rm
          }
        }
        allStrains.delete('')
        drawCanvas()
      }

      function drawPoints(){
        var yScale = (canHeight - 2*boarder) / maxRM;
        var xScale = (canWidth - 2*boarder) / maxSize;
        for(i = 0; i < dataPoints.length; i ++){
          dp = dataPoints[i]
          dp.x = boarder + dp.strains.length * xScale;
          dp.y = canHeight - boarder - dp.rm * yScale;
          ctx.fillStyle = "#FF0000";
          ctx.fillRect(dp.x,dp.y,2,2);
        }
        //drawing boarder
        ctx.fillStyle = "#000000";
        ctx.fillRect(boarder,canHeight-boarder,canWidth-(2*boarder),1);
        ctx.fillRect(boarder, boarder,1,canHeight-(2*boarder));
        //putting in numbers
        for(i = 0; i < maxSize; i+=10){
          ctx.fillText(""+i,boarder + xScale*i,canHeight-boarder+15);
        }
        for(i = 0; i < maxRM; i+=.1){
          ctx.fillText(""+Math.round( i * 10) / 10,3,canHeight-boarder-(yScale*i));
        }
      }

      function isPointInPoly(poly, pt){
          for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
              ((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
              && (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
              && (c = !c);
          return c;
      }

      function testArea(){
        justTested = true;
        polyPoints.push(polyPoints[0])
        drawPolyThing()
        console.log(polyPoints)
        for(i = 0; i < dataPoints.length; i ++){
          var dp = dataPoints[i];
          if(isPointInPoly(polyPoints,dp)){
            ctx.fillStyle = "#00FF00";
            ctx.fillRect(dp.x,dp.y,2,2);
            dp.inArea = true;
          }else{
            dp.inArea = false;
          }
        }
        updateList();
        polyPoints.pop()
      }

      function updateList(){
        var strainCount = {}
        var totalNumbParticles = 0;
        var strainsInArea = new Set([])
        var strainsNotInArea = new Set([])

        for(i = 0; i < dataPoints.length; i++){
          var dp = dataPoints[i];
          if(dp.inArea){
            totalNumbParticles +=1
            for(j = 0; j < dp.strains.length; j++){
              strainsInArea.add(dp.strains[j])
              if(dp.strains[j] in strainCount){
                strainCount[dp.strains[j]] += 1
              }
              else{
                strainCount[dp.strains[j]] = 1
              }
            }            
          }
        }
        for (let strain of allStrains){
          if(!strainsInArea.has(strain)){
            strainsNotInArea.add(strain)
          }
        }

        var sortedStrains = Array.from(strainsInArea)
        sortedStrains.sort(function(a, b){return strainCount[b]-strainCount[a]});
        listInAreaHtml = "Total: "+sortedStrains.length+"<br><table cellspacing=\"0\" cellpadding=\"0\"><tr><th>Strain Label</th><th>% of Points</th></tr>"
        var max = -1
        for(let strain of sortedStrains){
          var percent = Math.round(strainCount[strain] / totalNumbParticles * 1000)/10
          if(percent > max){
            max = percent
            console.log("change!")
          }
          var intensity = 255-Math.round((max-percent) *2.55)
          listInAreaHtml += "<tr style=\" background: rgb(255,"+intensity+","+intensity+"); \" ><td>"+strain+"</td><td>"+percent+"%</td></tr>"
        }
        listInAreaHtml+="</table>"
        listNotInAreaHtml = "Total: "+strainsNotInArea.size+"<br>"
        for(let strain of strainsNotInArea){
          listNotInAreaHtml += "<br>"+strain
        }
        document.getElementById("listInArea").innerHTML = listInAreaHtml
        document.getElementById("listNotInArea").innerHTML = listNotInAreaHtml
      }

      // canvas reset
      function drawCanvas(wide,height){
        if(wide){
          canWidth = wide;
          canHeight = height;         
        }
        canvasElement.width = canWidth;
        canvasElement.height = canHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPoints()
        document.getElementById("listInArea").innerHTML = ""
        document.getElementById("listNotInArea").innerHTML = ""
        drawPolyThing()
      }

      function resetPoly(){
        polyPoints = []
        drawCanvas()
      }

      function makeSmall() { 
        polyPoints = []
        drawCanvas(500,300);
      }


      function makeMid() { 
        polyPoints = []
        drawCanvas(700,500);
      }


      function makeBig() {
        polyPoints = []
        drawCanvas(1000,600);
      }
      
      function draw(lX, lY, cX, cY){
        ctx.moveTo(lX,lY);
        ctx.lineTo(cX,cY);
        ctx.strokeStyle = "#4bf";
        ctx.stroke();
      }
    }
  };
});
