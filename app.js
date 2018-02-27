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

      drawPoints()

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
      document.getElementById('resetArea').onclick = resetCanvas;
      document.getElementById('files').addEventListener('change', handleFileSelect, false);




      element.bind('mousedown', function(event){
        if(justTested){
          resetCanvas()
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
        ctx.beginPath();
        ctx.moveTo(polyPoints[0].x,polyPoints[0].y);
        for(i = 1; i < polyPoints.length; i++){
          ctx.lineTo(polyPoints[i].x,polyPoints[i].y);
          ctx.stroke();
        }
      }

      function loadRMFile(rmText){
        var entries = rmText.split('\n')
        dataPoints = []
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
        drawPoints()
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
        ctx.fillRect(boarder,canHeight-boarder,canWidth-2*boarder,1);
        ctx.fillRect(boarder, boarder,1,canHeight-2*boarder);
        for(i = 0; i < maxSize; i+=10){
          ctx.fillText(""+i,boarder + xScale*i,canHeight-boarder+15);
        }
        for(i = 0; i < maxRM; i+=.2){
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
        console.log(allStrains)
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

        listInAreaHtml = "<table><tr><th>Strain Label</th><th>% of Nodes</th></tr>"
        for(let strain of strainsInArea){
          listInAreaHtml += "<tr><td>"+strain+"</td><td>"+Math.round(strainCount[strain] / totalNumbParticles * 1000)/1000+"%</td></tr>"
        }
        listInAreaHtml+="</table>"
        listNotInAreaHtml = ""
        for(let strain of strainsNotInArea){
          listNotInAreaHtml += "<br>"+strain
        }
        document.getElementById("listInArea").innerHTML = listInAreaHtml
        document.getElementById("listNotInArea").innerHTML = listNotInAreaHtml
      }

      // canvas reset
      function resetCanvas(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPoints()
        document.getElementById("listInArea").innerHTML = ""
        document.getElementById("listNotInArea").innerHTML = ""
        polyPoints = []
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
