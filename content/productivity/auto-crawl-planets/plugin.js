// Auto Crawl Planets
//
// 1.basically this plugin will auto crawl plants around, but it will calculate the priority first, high level plant has more priority, and if the plugin cant get the high priority 
// plant, then it will choose a plant nearby and towards the high priority plant, you can change the priority calculate function.
// 2.the plugin allow multi crawl if you check the multi crawl button, which means the plugin will send energy to the plant even cant grap plant in a single transfer
// 3.in darkforest Round3, this plugin will crawl plants towards the center, which means plants near center has much higher priority.
const {
  isMine,
  isUnowned,
  canHaveArtifact,
} = await import('https://plugins.zkga.me/utils/utils.js');

import { EMPTY_ADDRESS } from "https://cdn.skypack.dev/@darkforest_eth/constants";
import {
  PlanetType,
  PlanetTypeNames,
  PlanetLevel,
  PlanetLevelNames,
  //Artifact,
  ArtifactType,
} from "https://cdn.skypack.dev/@darkforest_eth/types";


const planetTypes = {
  'Planet': 0,
  'Asteroid': 1,
  'Foundry': 2,
  'Spacetime_Rip': 3,
  'Quasar': 4,
};

const planetLevels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const players = [
  EMPTY_ADDRESS
];

const typeNames = Object.keys(planetTypes);

const checkTypes = [];

let poi = [];
let extendAreaCircles = [];
let canvas = null;

let startAddCircle = false;
let circleCenterX = 0;
let circleCenterY = 0;
let alreadySetCircleCenter = false;

class Plugin {
  constructor() {
    // this.startAddCircle = false;
    // this.circleCenterX = 0;
    // this.circleCenterY = 0;
    // this.alreadySetCircleCenter = false;

    this.planetType = PlanetType.SILVER_MINE;
    this.minimumEnergyAllowed = 15;
    this.minPlanetLevel = 3;
    this.maxEnergyPercent = 85;

    this.minPlantLevelToUse = 2;
    this.maxPlantLevelToUse = 5;
    this.autoSeconds = 30;
    this.message = document.createElement('div');
    this.allowMultiCrawl = false;

  }
  async render(container) {
    container.style.width = '300px';

    let addCircle = document.createElement('button');
    addCircle.style.width = '100%';
    addCircle.style.marginTop = '10px';
    addCircle.style.marginBottom = '10px';
    addCircle.innerHTML = 'Add extend area'
    addCircle.onclick = () => {
      debugger;
   //  if(canvas.onclick === null) {
      canvas.onclick = this.drawCircle;
    // }

      startAddCircle = true;
    }

    let removeCircles = document.createElement('button');
    removeCircles.style.width = '100%';
    removeCircles.style.marginTop = '10px';
    removeCircles.style.marginBottom = '10px';
    removeCircles.innerHTML = 'remove all extend area'
    removeCircles.onclick = () => {
      extendAreaCircles = [];
    }

    let stepperLabel = document.createElement('label');
    stepperLabel.innerText = 'Max % energy to spend';
    stepperLabel.style.display = 'block';

    let stepper = document.createElement('input');
    stepper.type = 'range';
    stepper.min = '0';
    stepper.max = '100';
    stepper.step = '5';
    stepper.value = `${this.maxEnergyPercent}`;
    stepper.style.width = '80%';
    stepper.style.height = '24px';

    let percent = document.createElement('span');
    percent.innerText = `${stepper.value}%`;
    percent.style.float = 'right';

    stepper.onchange = (evt) => {
      percent.innerText = `${evt.target.value}%`;
      try {
        this.maxEnergyPercent = parseInt(evt.target.value, 10);
      } catch (e) {
        console.error('could not parse energy percent', e);
      }
    }


    let minimumEnergyAllowedLabel = document.createElement('label');
    minimumEnergyAllowedLabel.innerText = '% energy to fill after capture';
    minimumEnergyAllowedLabel.style.display = 'block';

    let minimumEnergyAllowedSelect = document.createElement('input');
    minimumEnergyAllowedSelect.type = 'range';
    minimumEnergyAllowedSelect.min = '0';
    minimumEnergyAllowedSelect.max = '100';
    minimumEnergyAllowedSelect.step = '1';
    minimumEnergyAllowedSelect.value = `${this.minimumEnergyAllowed}`;
    minimumEnergyAllowedSelect.style.width = '80%';
    minimumEnergyAllowedSelect.style.height = '24px';

    let percentminimumEnergyAllowed = document.createElement('span');
    percentminimumEnergyAllowed.innerText = `${minimumEnergyAllowedSelect.value}%`;
    percentminimumEnergyAllowed.style.float = 'right';

    minimumEnergyAllowedSelect.onchange = (evt) => {
      if (parseInt(evt.target.value, 10) === 0) percentminimumEnergyAllowed.innerText = `1 energy`;
      else
        percentminimumEnergyAllowed.innerText = `${evt.target.value}%`;
      try {
        this.minimumEnergyAllowed = parseInt(evt.target.value, 10);
      } catch (e) {
        console.error('could not parse minimum energy allowed percent', e);
      }
    }

    let autoSecondsLabel = document.createElement('label');
    autoSecondsLabel.innerText = 'Every X seconds';
    autoSecondsLabel.style.display = 'block';

    let autoSecondsStepper = document.createElement('input');
    autoSecondsStepper.type = 'range';
    autoSecondsStepper.min = '30';
    autoSecondsStepper.max = '6000';
    autoSecondsStepper.step = '30';
    autoSecondsStepper.value = `${this.autoSeconds}`;
    autoSecondsStepper.style.width = '80%';
    autoSecondsStepper.style.height = '24px';

    let autoSecondsInfo = document.createElement('span');
    autoSecondsInfo.innerText = `${autoSecondsStepper.value} secs`;
    autoSecondsInfo.style.float = 'right';

    autoSecondsStepper.onchange = (evt) => {
      try {
        this.autoSeconds = parseInt(evt.target.value, 10);
        autoSecondsInfo.innerText = `${this.autoSeconds} secs`;
      } catch (e) {
        console.error('could not parse auto seconds', e);
      }
    }



    let levelLabel = document.createElement('label');
    levelLabel.innerText = 'Min. level to capture';
    levelLabel.style.display = 'block';

    let level = document.createElement('select');
    level.style.background = 'rgb(8,8,8)';
    level.style.width = '100%';
    level.style.marginTop = '10px';
    level.style.marginBottom = '10px';
    planetLevels.forEach(lvl => {
      let opt = document.createElement('option');
      opt.value = `${lvl}`;
      opt.innerText = `Level ${lvl}`;
      level.appendChild(opt);
    });
    level.value = `${this.minPlanetLevel}`;

    level.onchange = (evt) => {
      try {
        this.minPlanetLevel = parseInt(evt.target.value, 10);
      } catch (e) {
        console.error('could not parse planet level', e);
      }
    }

    // minimum plant level used to capture new plant
    let levelLabelMinUse = document.createElement('label');
    levelLabelMinUse.innerText = 'Min. level to Use';
    levelLabelMinUse.style.display = 'block';

    let levelMinUse = document.createElement('select');
    levelMinUse.style.background = 'rgb(8,8,8)';
    levelMinUse.style.width = '100%';
    levelMinUse.style.marginTop = '10px';
    levelMinUse.style.marginBottom = '10px';
    planetLevels.forEach(lvl => {
      let opt = document.createElement('option');
      opt.value = `${lvl}`;
      opt.innerText = `Level ${lvl}`;
      levelMinUse.appendChild(opt);
    });
    levelMinUse.value = `${this.minPlantLevelToUse}`;

    levelMinUse.onchange = (evt) => {
      try {
        this.minPlantLevelToUse = parseInt(evt.target.value, 10);
      } catch (e) {
        console.error('could not parse planet level', e);
      }
    }

    // maxmum plant level used to capture new plant
    let levelLabelMaxUse = document.createElement('label');
    levelLabelMaxUse.innerText = 'Max. level to Use';
    levelLabelMaxUse.style.display = 'block';

    let levelMaxUse = document.createElement('select');
    levelMaxUse.style.background = 'rgb(8,8,8)';
    levelMaxUse.style.width = '100%';
    levelMaxUse.style.marginTop = '10px';
    levelMaxUse.style.marginBottom = '10px';
    planetLevels.forEach(lvl => {
      let opt = document.createElement('option');
      opt.value = `${lvl}`;
      opt.innerText = `Level ${lvl}`;
      levelMaxUse.appendChild(opt);
    });
    levelMaxUse.value = `${this.maxPlantLevelToUse}`;

    levelMaxUse.onchange = (evt) => {
      try {
        this.maxPlantLevelToUse = parseInt(evt.target.value, 10);
      } catch (e) {
        console.error('could not parse planet level', e);
      }
    }


    let planetTypeLabel = document.createElement('label');
    planetTypeLabel.innerText = 'Select planetType: ';
    planetTypeLabel.style.display = 'block';
    planetTypeLabel.style.paddingBottom = "6px";

    // planet checkbox
    let planetLabel = document.createElement('label');
    planetLabel.innerHTML = 'Planet';
    planetLabel.style.paddingRight = "10px";

    let planetCheck = document.createElement('input');
    planetCheck.type = "checkbox";
    planetCheck.value = planetTypes.Planet;
    planetCheck.style.marginRight = "10px";
    planetCheck.checked = false;
    planetCheck.onchange = (evt) => {
      if (evt.target.checked) {
        // add to arr
        checkTypes.push(planetCheck.value);
      } else {
        // delete from arr
        let i = checkTypes.indexOf(planetCheck.value);
        checkTypes.splice(i, 1);
      }
    };

    // asteroid checkbox
    let asteroidLabel = document.createElement('label');
    asteroidLabel.innerHTML = 'Asteroid';
    asteroidLabel.style.paddingRight = "10px";

    let asteroidCheck = document.createElement('input');
    asteroidCheck.type = "checkbox";
    asteroidCheck.value = planetTypes.Asteroid;
    asteroidCheck.style.marginRight = "10px";
    asteroidCheck.checked = false;
    asteroidCheck.onchange = (evt) => {
      if (evt.target.checked) {
        checkTypes.push(asteroidCheck.value);
      } else {
        let i = checkTypes.indexOf(asteroidCheck.value);
        checkTypes.splice(i, 1);
      }
    };

    // Foundry checkbox
    let foundryLabel = document.createElement('label');
    foundryLabel.innerHTML = 'Foundry';
    foundryLabel.style.paddingRight = "10px";

    let foundryCheck = document.createElement('input');
    foundryCheck.type = "checkbox";
    foundryCheck.value = planetTypes.Foundry;
    foundryCheck.style.marginRight = "10px";
    foundryCheck.checked = false;
    foundryCheck.onchange = (evt) => {
      if (evt.target.checked) {
        checkTypes.push(foundryCheck.value);
      } else {
        let i = checkTypes.indexOf(foundryCheck.value);
        checkTypes.splice(i, 1);
      }
      console.log(checkTypes);
    };

    // Spacetime Rip checkbox
    let spaceRipLabel = document.createElement('label');
    spaceRipLabel.innerHTML = 'Spacetime Rip';
    spaceRipLabel.style.paddingRight = "10px";

    let spaceRipCheck = document.createElement('input');
    spaceRipCheck.type = "checkbox";
    spaceRipCheck.value = planetTypes.Spacetime_Rip;
    spaceRipCheck.style.marginRight = "10px";
    spaceRipCheck.checked = false;
    spaceRipCheck.onchange = (evt) => {
      if (evt.target.checked) {
        checkTypes.push(spaceRipCheck.value);
      } else {
        let i = checkTypes.indexOf(spaceRipCheck.value);
        checkTypes.splice(i, 1);
      }
      console.log(checkTypes);
    };

    // Quasar checkbox
    let quasarLabel = document.createElement('label');
    quasarLabel.innerHTML = 'Quasar';
    quasarLabel.style.paddingRight = "10px";

    let quasarCheck = document.createElement('input');
    quasarCheck.type = "checkbox";
    quasarCheck.value = planetTypes.Quasar;
    quasarCheck.style.marginRight = "10px";
    quasarCheck.checked = false;
    quasarCheck.onchange = (evt) => {
      if (evt.target.checked) {
        checkTypes.push(quasarCheck.value);
      } else {
        let i = checkTypes.indexOf(quasarCheck.value);
        checkTypes.splice(i, 1);
      }
      console.log(checkTypes);
    };



    let message = document.createElement('div');

    let button = document.createElement('button');
    button.style.width = '100%';
    button.style.marginTop = '10px';
    button.style.marginBottom = '10px';
    button.innerHTML = 'Crawl Plant!'
    button.onclick = () => {
      calculatePoi(this.minPlanetLevel, checkTypes);
      crawlPlantForPoi(this.minPlanetLevel, this.maxEnergyPercent, this.minPlantLevelToUse, this.maxPlantLevelToUse, this.minimumEnergyAllowed, this.allowMultiCrawl);
    }

    let autoCrwalLabel = document.createElement('label');
    autoCrwalLabel.innerHTML = 'Automatic CrawlPlant';
    autoCrwalLabel.style.paddingRight = "10px";

    let autoCrawlPlantCheck = document.createElement('input');
    autoCrawlPlantCheck.type = "checkbox";
    autoCrawlPlantCheck.style.marginRight = "10px";
    autoCrawlPlantCheck.checked = false;
    autoCrawlPlantCheck.onchange = (evt) => {
      if (evt.target.checked) {
        this.sendTimer = setInterval(() => {
          this.message.innerText = 'Auto CrawlPlant...';

          setTimeout(() => {
            calculatePoi(this.minPlanetLevel, checkTypes);
            crawlPlantForPoi(this.minPlanetLevel, this.maxEnergyPercent, this.minPlantLevelToUse, this.maxPlantLevelToUse, this.minimumEnergyAllowed, this.allowMultiCrawl);
          }, 0);
        }, 1000 * this.autoSeconds)
      } else {
        this.message.innerText = 'CrawlPlant by Hand';
        this.clearSendTimer();
      }
    };

    let allowMultiCrawlLabel = document.createElement('label');
    allowMultiCrawlLabel.innerHTML = 'Allow Multi Crawl _______';
    allowMultiCrawlLabel.style.paddingRight = "10px";

    let allowMultiCrawlPlantCheck = document.createElement('input');
    allowMultiCrawlPlantCheck.type = "checkbox";
    allowMultiCrawlPlantCheck.style.marginRight = "10px";
    allowMultiCrawlPlantCheck.checked = false;
    allowMultiCrawlPlantCheck.onchange = (evt) => {
      if (evt.target.checked) {
        this.allowMultiCrawl = true;
      } else {
        this.allowMultiCrawl = false;
      }
    };

    container.appendChild(addCircle);
    container.appendChild(removeCircles);

    container.appendChild(stepperLabel);
    container.appendChild(stepper);
    container.appendChild(percent);
    container.appendChild(minimumEnergyAllowedLabel);
    container.appendChild(minimumEnergyAllowedSelect);
    container.appendChild(percentminimumEnergyAllowed);

    // Moves
    container.appendChild(autoSecondsLabel);
    container.appendChild(autoSecondsStepper);
    container.appendChild(autoSecondsInfo);

    container.appendChild(levelLabel);
    container.appendChild(level);
    container.appendChild(levelLabelMinUse);
    container.appendChild(levelMinUse);
    container.appendChild(levelLabelMaxUse);
    container.appendChild(levelMaxUse);

    container.appendChild(planetTypeLabel);

    // planet checkbox
    container.appendChild(planetLabel);
    container.appendChild(planetCheck);

    // asteroid checkbox
    container.appendChild(asteroidLabel);
    container.appendChild(asteroidCheck);

    // foundry checkbox
    container.appendChild(foundryLabel);
    container.appendChild(foundryCheck);

    // spacetime checkbox
    container.appendChild(spaceRipLabel);
    container.appendChild(spaceRipCheck);

    // quasar checkbox
    container.appendChild(quasarLabel);
    container.appendChild(quasarCheck);

    container.appendChild(button);
    container.appendChild(message);

    //allowMultiCrawl
    container.appendChild(allowMultiCrawlLabel);
    container.appendChild(allowMultiCrawlPlantCheck);

    // Auto Crwal Plant
    container.appendChild(autoCrwalLabel);
    container.appendChild(autoCrawlPlantCheck);
    container.appendChild(this.message);
  }
  clearSendTimer() {
    if (this.sendTimer) {
      clearInterval(this.sendTimer);
    }
  }

  destroy() {
    this.clearSendTimer()
  }

  draw(ctx) {

    //debugger;
    if (canvas === null) {
      canvas = ctx.canvas;
    }

    const viewport = ui.getViewport();

    ctx.strokeStyle = '#FFC0CB';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(viewport.worldToCanvasX(circleCenterX), viewport.worldToCanvasY(circleCenterY), 2, 0, 2 * Math.PI);
    ctx.stroke();

    for (let circle in extendAreaCircles){
      //debugger;
      const pixelCenterX = viewport.worldToCanvasX(extendAreaCircles[circle].x);
      const pixelCenterY = viewport.worldToCanvasY(extendAreaCircles[circle].y);
      const trueRadius = viewport.worldToCanvasDist(extendAreaCircles[circle].radius);


      ctx.beginPath();
      ctx.arc(pixelCenterX, pixelCenterY, trueRadius, 0, 2 * Math.PI);
      ctx.stroke();

    }

    // const pixelCenterX = viewport.worldToCanvasX(this.extendAreaX);
    // const pixelCenterY = viewport.worldToCanvasY(this.extendAreaY);
    // const trueRadius = viewport.worldToCanvasDist(this.extendAreaRadius);

    // ctx.strokeStyle = '#FFC0CB';
    // ctx.lineWidth = 2;
    // ctx.beginPath();
    // ctx.arc(pixelCenterX, pixelCenterY, trueRadius, 0, 2 * Math.PI);
    // ctx.stroke();

  }
  drawCircle(e) {
    debugger;
    const viewport = ui.getViewport();

    // 取得画布上被单击的点
    let clickX = e.pageX - canvas.offsetLeft;
    let clickY = e.pageY - canvas.offsetTop;
    let radius = 0;
    // 为圆圈计算一个随机颜色
    let colors = ["green", "blue", "red", "yellow", "magenta", "orange", "brown", "purple", "pink"];
    let color = colors[2];

    if (alreadySetCircleCenter === true) {
      clickX = e.pageX - canvas.offsetLeft;
      clickX = viewport.canvasToWorldX(clickX);
      clickY = e.pageY - canvas.offsetTop;
      clickY = viewport.canvasToWorldY(clickY);
      radius = Math.sqrt((clickX - circleCenterX) ** 2 + (clickY - circleCenterY) ** 2);
      // 创建一个新圆圈
      let circle = new Circle(circleCenterX, circleCenterY, radius, color);

      // 把它保存在数组中
      extendAreaCircles.push(circle);

      alreadySetCircleCenter = false;
      startAddCircle = false;
      circleCenterX = 0;
      circleCenterY = 0;
    }     
    else if (startAddCircle === true) {

      clickX = e.pageX - canvas.offsetLeft;
      circleCenterX = viewport.canvasToWorldX(clickX);
      clickY = e.pageY - canvas.offsetTop;
      circleCenterY = viewport.canvasToWorldY(clickY);
      alreadySetCircleCenter = true
    }


  }


}

export default Plugin;

function checkIfInExtendArea(plant){
  for (let circle in extendAreaCircles){
   if(Math.sqrt((plant.location.coords.x - extendAreaCircles[circle].x) ** 2 + (plant.location.coords.y - extendAreaCircles[circle].y) ** 2) > extendAreaCircles[circle].radius) {
     return false;
   }
  }
  return true;
}

function Circle(x, y, radius, color) {
  this.x = x;
  this.y = y;
  this.radius = radius;
  this.color = color;
}

function getArrivalsForPlanet(planetId) {
  return df.getAllVoyages().filter(arrival => arrival.toPlanet === planetId).filter(p => p.arrivalTime > Date.now() / 1000);
}

//returns tuples of [planet,distance]
function distance(from, to) {
  let fromloc = from.locationId;
  let toloc = to.locationId;
  //return Math.sqrt((fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2);
  return df.getDist(fromloc, toloc);
}

function calculatePoi(minCaptureLevel, checkTypes) {
  debugger;
  checkTypes = JSON.parse('[' + String(checkTypes) + ']')

  const candidatesOri = df.getPlanetMap();
  let candidates = [];

  let keys = candidatesOri.keys()
  for (let key of keys) {
    candidates.push(candidatesOri.get(key));
  }


  poi = candidates.filter(p => (
    p.owner !== df.account &&
    players.includes(p.owner) &&
    //set the minium poi level
    p.planetLevel >= minCaptureLevel + 2 &&
    p.planetLevel <= 8 &&   //level 9 is too big
    checkTypes.includes(p.planetType) &&
    //set poi radius range
    //Math.sqrt((p.location.coords.x - extendAreaX) ** 2 + (p.location.coords.y - extendAreaY) ** 2) <= extendAreaRadius))
    checkIfInExtendArea(p)))
    .map(to => {
      return [to, priorityinlevelCalculate(to)]
    })
    .sort((a, b) => b[1] - a[1]);
  console.log("poi");
}

function priorityCalculate(planetObject) {
  let priority = 0;
  priority = Math.sqrt((planetObject.location.coords.x - 0) ** 2 + (planetObject.location.coords.y - 0) ** 2);

  return priority;

}

function priorityinlevelCalculate(planetObject) {
  let priority = 0;
  switch (planetObject.planetType) {
    //fountry
    case 2:
      priority = planetObject.planetLevel * 3;
      break;
    //Asteroid
    case 1:
      priority = planetObject.planetLevel * 2.1;
      break;
    //spacetimerip
    case 3:
      priority = planetObject.planetLevel * 2;
      break;
    //plant
    case 0:
      priority = planetObject.planetLevel * 1.5;
      break;
    //Quasar
    case 4:
      priority = 0;
      break;
    default:
      break;
  }

  //priority = Math.sqrt((planetObject.coords.x - 0) ** 2 + (planetObject.coords.y - 0) ** 2);

  return priority;

}

function haveUsefulArtifacts(plant) {
  let ArtifactsQuene = df.getGameObjects().getPlanetArtifacts(plant.locationId);
  for (let artifact in ArtifactsQuene) {
    if (ArtifactsQuene[artifact].artifactType === ArtifactType.PhotoidCannon)
      return true;
  }
  return false;
}


function crawlPlantForPoi(minPlanetLevel, maxEnergyPercent, minPlantLevelToUse, maxPlantLevelToUse, minimumEnergyAllowed, allowMultiCrawl) {
  debugger;
  //for each plant in poi
  for (let poiPlant in poi) {
    let candidates_Ori;
    try {
      candidates_Ori = df.getPlanetsInRange(poi[poiPlant][0].locationId, 25);
    } catch (error) {
      continue;
    }

    let candidates;
    candidates = candidates_Ori.filter(p => (
      p.owner === df.account &&
      p.planetLevel >= minPlantLevelToUse &&
      p.planetLevel <= maxPlantLevelToUse &&
      //!canHaveArtifact(p) &&
      !haveUsefulArtifacts(p) &&
      //energy > 80%
      p.energy > p.energyCap * 0.8 &&
      //in extend area
      checkIfInExtendArea(p)))
      //Math.sqrt((p.location.coords.x - extendAreaX) ** 2 + (p.location.coords.y - extendAreaY) ** 2) <= extendAreaRadius))
      .sort((a, b) => distance(poi[poiPlant][0], a) * (12 - a.planetLevel) - distance(poi[poiPlant][0], b) * (12 - b.planetLevel));

    for (let candidatePlant in candidates) {

      crawlPlantMy(minPlanetLevel, maxEnergyPercent, poi[poiPlant][0], candidates[candidatePlant], checkTypes, minimumEnergyAllowed, allowMultiCrawl);

    }
  }

}

function crawlPlantMy(minPlanetLevel, maxEnergyPercent, poiPlant, candidatePlant, checkTypes, minimumEnergyAllowed = 0, allowMultiCrawl = false) {
  checkTypes = JSON.parse('[' + String(checkTypes) + ']')

  let candidateCapturePlants;
  try {
    candidateCapturePlants = df.getPlanetsInRange(candidatePlant.locationId, maxEnergyPercent)
      .filter(p => (p.planetLevel >= minPlanetLevel &&
        p.owner !== df.account &&
        players.includes(p.owner) &&
        checkTypes.includes(p.planetType) &&
        p.energy * p.defense / (100 * p.planetLevel) < candidatePlant.energy &&
        checkIfInExtendArea(p)))
        //Math.sqrt((p.location.coords.x - extendAreaX) ** 2 + (p.location.coords.y - extendAreaY) ** 2) <= extendAreaRadius));
  } catch (error) {
    return;
  }

  let comboMap = candidateCapturePlants.map(p => {
    return [p, priorityinlevelCalculate(p) * (p.bonus[3] > 0 ? p.bonus[3] : 1) * 2 + distance(poiPlant, candidatePlant) / (distance(poiPlant, p) + 1)]
  }).sort((a, b) => b[1] - a[1]);




  const planet = candidatePlant;
  const from = candidatePlant;

  const silverBudget = Math.floor(from.silver);

  // Rejected if has pending outbound moves
  let energyUncomfiredFromQuene = df.getUnconfirmedMoves().filter(move => move.from === from.locationId)
  let energyVoyagesFromQuene = df.getAllVoyages().filter(move => move.fromPlanet === from.locationId && move.arrivalTime > Date.now() / 1000)
  let energyUncomfiredFrom = 0;
  for (let moves in energyUncomfiredFromQuene) {
    energyUncomfiredFrom = energyUncomfiredFrom + energyUncomfiredFromQuene[moves].forces;
  }
  if (energyUncomfiredFromQuene.length + energyVoyagesFromQuene.length > 4 || (candidatePlant.energy - energyUncomfiredFrom) <= candidatePlant.energyCap * maxEnergyPercent * 0.01) {
    return 0;
  }



  let i = 0;
  //const energyBudget = Math.floor((maxEnergyPercent / 100) * planet.energyCap);
  const energyBudget = planet.energy;

  let energySpent = 0;
  let moves = 0;
  let silverNeed = 0;
  let silverSpent = 0;
  let minimumEnergyAllowedInNum = 0;
  while (energyBudget - energySpent > 0 && i < comboMap.length) {

    const energyLeft = energyBudget - energySpent;
    const silverLeft = silverBudget - silverSpent;

    // Remember its a tuple of candidates and their distance
    const candidateCapturePlantInstance = comboMap[i++][0];

    // Rejected if has unconfirmed pending arrivals
    const energyUncomfiredToQuene = df.getUnconfirmedMoves().filter(move => move.to === candidateCapturePlantInstance.locationId)
    let energyUncomfiredTo = 0;
    for (let moves in energyUncomfiredToQuene) {
      energyUncomfiredTo = energyUncomfiredTo + energyUncomfiredToQuene[moves].forces;
    }
    // if (unconfirmed.length > 4 || energyUncomfired >= candidateCapturePlantInstance.energy * (candidateCapturePlantInstance.defense / 100)) {
    //   continue;
    // }

    // Rejected if has pending arrivals
    const arrivals = getArrivalsForPlanet(candidateCapturePlantInstance.locationId);
    let energyOntheWay = 0;
    for (let moves in arrivals) {
      energyOntheWay = energyOntheWay + arrivals[moves].energyArriving;
    }
    if (arrivals.length + energyUncomfiredToQuene.length > 4 || energyOntheWay + energyUncomfiredTo >= candidateCapturePlantInstance.energy * (candidateCapturePlantInstance.defense / 100)) {
      continue;
    }

    const energyUncomfiredfromQuene = df.getUnconfirmedMoves().filter(move => move.from === from.locationId);
    const energyVoyagesFromQuene = df.getAllVoyages().filter(move => move.fromPlanet === from.locationId && move.arrivalTime > Date.now() / 1000)
    let energyUncomfiredfrom = 0;
    for (let moves in energyUncomfiredfromQuene) {
      energyUncomfiredfrom = energyUncomfiredfrom + energyUncomfiredfromQuene[moves].forces;
    }

    if (energyUncomfiredfromQuene.length + energyVoyagesFromQuene.length > 4 || (candidatePlant.energy - energyUncomfiredfrom) <= candidatePlant.energyCap * maxEnergyPercent * 0.01) {
      continue;
    }

    if (minimumEnergyAllowed === 0) minimumEnergyAllowed = 1
    else
      minimumEnergyAllowedInNum = Math.ceil(candidateCapturePlantInstance.energyCap * minimumEnergyAllowed / 100);
    const energyArriving = minimumEnergyAllowedInNum + Math.ceil(candidateCapturePlantInstance.energy * (candidateCapturePlantInstance.defense / 100));
    // needs to be a whole number for the contract
    let energyNeeded = Math.ceil(df.getEnergyNeededForMove(candidatePlant.locationId, candidateCapturePlantInstance.locationId, energyArriving));
    let multiCrawlEnergyNeeded = Math.ceil(df.getEnergyNeededForMove(candidatePlant.locationId, candidateCapturePlantInstance.locationId, Math.ceil((energyArriving - minimumEnergyAllowedInNum) / candidateCapturePlantInstance.planetLevel)));
    if (energyLeft - energyNeeded - energyUncomfiredfrom < candidatePlant.energyCap * (100 - maxEnergyPercent) * 0.01) {

      if (allowMultiCrawl === true) {
        if (energyLeft - multiCrawlEnergyNeeded - energyUncomfiredfrom < candidatePlant.energyCap * (100 - maxEnergyPercent) * 0.01)
          continue;
        else {

          // if (df.getAllVoyages().filter(arrival => arrival.fromPlanet === from.locationId).length  > 1)
          //    continue;
          energyNeeded = Math.ceil(energyLeft - energyUncomfiredfrom - candidatePlant.energyCap * (100 - maxEnergyPercent) * 0.01);
        }
      }
      else
        continue;
    }


    if (from.planetType === 1 && candidateCapturePlantInstance.planetType === 0) {
      silverNeed = candidateCapturePlantInstance.silverCap > silverLeft ? silverLeft : candidateCapturePlantInstance.silverCap;
      silverSpent += silverNeed;
    }

    df.move(candidatePlant.locationId, candidateCapturePlantInstance.locationId, energyNeeded, 0);

    energySpent += energyNeeded;
    moves += 1;
  }
  return moves;
}