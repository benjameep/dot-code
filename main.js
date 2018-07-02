const svg = d3.select('svg')
const width = svg.attr('width')
let height = svg.attr('height')

const key = ['abcdefghijklmnopqrstuvwxyz.,?! \n','0123456789etaoinshrdlcumwfgypbvkjxqz']
const letterHeight = 40
const letterWidth = letterHeight * .6
const lineSpacing = letterHeight * .4
const letterSpacing = letterHeight * .3
const lineWidth = letterHeight * 0.04
const density = lineWidth*4
const padding = {top:40,sides:40}

const input = d3.select('textarea')
  .attr('cols',Math.floor((width-padding.sides*2)/(letterWidth+letterSpacing)))
const link = d3.select('#link')

const $nodes = svg.append('g')
const angle = ([cx,cy],[ex,ey]) => Math.atan2(ey - cy, ex - cx)
const point = ([x,y], angle, distance) => [Math.cos(angle)*distance + x,Math.sin(angle)*distance + y]
const lx = d3.scaleLinear().domain([0,12]).range([0,letterWidth])
const ly = d3.scaleLinear().domain([0,12]).range([0,letterHeight])
const distractions = []
const distractionLevel = 3

const simulation = d3.forceSimulation(density)
  .force('collide',d3.forceCollide(density).strength(1))
  .force('charge',d3.forceManyBody().strength(.9).distanceMax(density*5))

function letterNodes([px,py],letter){
  var points = letters[letter].map(([[x,y]]) => [px+lx(x),py+ly(y)])
  return letters[letter].map(([,c],i) => ({
    fx:points[i][0],
    fy:points[i][1],
    x:points[i][0],
    y:points[i][1],
    arms:c.map(n => points[n]),
    hasCircle:c.length<=1,
  }))
}

function createNodes(message){
  var lines = message.split('\n').map(n => n.toUpperCase().trim().split(''))
  height = padding.top*2+lines.length*(letterHeight+lineSpacing)
  svg.attr('height',height)
  var nodes = []
  lines.forEach((line,i) => {
    var lineStart = (width-(line.length*(letterWidth+letterSpacing)+padding.sides*2))/2
    line.forEach((letter,j) => {
      if(letters[letter]){
        nodes.push(...letterNodes([
          lineStart+padding.sides+j*(letterWidth+letterSpacing),
          padding.top+i*(letterHeight+lineSpacing)
        ],letter))
      }
    })
  })
  return nodes
}

function createDistractions(nodes){
  distractions.length = nodes.length * distractionLevel
  for(var i = 0; i < distractions.length; i++){
    if(!distractions[i]){
      var cir = Math.floor(Math.random()*2)
      var ni = Math.floor(i/distractionLevel)
      var tie = nodes[ni]
      distractions[i] = {
        tie:ni,
        tiex:tie.x,
        tiey:tie.y,
        x:tie.x,
        y:tie.y,
        hasCircle:!cir,
        arms:cir ? [[tie.x+Math.random(),tie.y+Math.random()]] : [],
      }
    } else {
      var node = distractions[i], 
      tie = nodes[node.tie]
      node.x -= node.tiex - tie.x
      node.y -= node.tiey - tie.y
      node.tiex = tie.x
      node.tiey = tie.y
    }
  }
}

function update(message){
  var nodes = createNodes(message)
  createDistractions(nodes)
  // console.log(nodes)
  // console.log(distractions)
  // Interpolate the data
  var _nodes = $nodes.selectAll('g').data(nodes.concat(distractions))
  // Create the new Groups
  var entering = _nodes.enter().append('g')
  // Create the circles
  entering.append('circle')
  // Merge the current and entering
  var updating = entering.merge(_nodes)
  // Update the circle radius
  updating.select('circle').attr('r',d => lineWidth*d.hasCircle)
  // Update the arms
  updating.each(function(n){
      var _arms = d3.select(this).selectAll('path').data(n.arms)
      _arms
        .enter().append('path')
          .attr('stroke','black')
          .attr('stroke-width',lineWidth)
          .attr('stroke-linecap',"square")
        .merge(_arms)
          .attr('d',d => `M${[0,0]} L ${point([0,0],angle([n.x,n.y],d),lineWidth*1.5)}`)
      _arms.exit().remove()
  })
  // Remove the extra nodes
  _nodes.exit().remove()

  // Update the simulation
  simulation
    .nodes(nodes.concat(distractions))
    .on('tick',() => {
      updating.attr('transform',d => `translate(${[d.x,d.y]})`)
    })
    .alphaTarget(0.3).restart()
}

input.on('keyup',function(){
  var message = new FormData(document.querySelector('form')).get('message')
  update(message)
  var disguised = message.toLowerCase().split('').map(s => key[0].indexOf(s)).filter(n => n!=-1).map(n => key[1][n]).join('')
  link.on('click',() => location = '?'+disguised)
})

if(location.search.length > 1){
  d3.select('#input').style('display','none')
  link.attr('class','fas fa-pen').on('click',() => window.location = '?')
  var A = 'A'.charCodeAt(0),Z = 'Z'.charCodeAt(0)
  var undid = location.search.slice(1).split('').map(s => key[0][key[1].indexOf(s)]).join('')
  update(undid)
}