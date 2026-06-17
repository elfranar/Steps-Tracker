const GOAL = 8000
const storageKey = 'stepTrackerData'

const stepsCountEl = document.getElementById('stepsCount')
const distanceCountEl = document.getElementById('distanceCount')
const caloriesCountEl = document.getElementById('caloriesCount')
const goalPercentEl = document.getElementById('goalPercent')
const paceCountEl = document.getElementById('paceCount')
const modeLabelEl = document.getElementById('modeLabel')
const statusLabelEl = document.getElementById('statusLabel')
const toggleBtn = document.getElementById('toggleBtn')
const startBtn = document.getElementById('startBtn')
const pauseBtn = document.getElementById('pauseBtn')
const resetBtn = document.getElementById('resetBtn')

let steps = Number(localStorage.getItem(storageKey) || 0)
let tracking = false
let isDemoMode = false
let motionSupported = false
let demoTimer = null
let startTime = null
let lastMotionValue = 0
let lastStepTime = 0

function saveData() {
  localStorage.setItem(storageKey, String(steps))
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

function getDistance() {
  return steps * 0.000762
}

function getCalories() {
  return steps * 0.04
}

function getElapsedHours() {
  if (!startTime) return 0
  return Math.max((Date.now() - startTime) / 1000 / 60 / 60, 0.0001)
}

function updateUI() {
  const distance = getDistance()
  const calories = getCalories()
  const progress = Math.min((steps / GOAL) * 100, 100)
  const pace = steps > 0 ? (distance / getElapsedHours()) : 0

  stepsCountEl.textContent = formatNumber(steps)
  distanceCountEl.textContent = `${distance.toFixed(2)} km`
  caloriesCountEl.textContent = `${Math.round(calories)} kcal`
  goalPercentEl.textContent = `${Math.round(progress)}%`
  paceCountEl.textContent = `${pace.toFixed(1)} km/h`

  const ringValue = Math.min(progress * 3.6, 360)
  document.querySelector('.progress-ring').style.background = `radial-gradient(circle at center, #0b1120 58%, transparent 59%), conic-gradient(var(--accent) 0deg, var(--accent-2) ${ringValue}deg, var(--warning) 360deg)`

  statusLabelEl.textContent = tracking ? 'Tracking' : 'Paused'
  modeLabelEl.textContent = isDemoMode ? 'Demo mode' : motionSupported ? 'Sensor mode' : 'Manual mode'
  toggleBtn.textContent = tracking ? 'Pause' : 'Start'
  startBtn.textContent = tracking ? 'Tracking...' : 'Start tracking'
}

function addStep() {
  steps += 1
  saveData()
  updateUI()
  if (navigator.vibrate) {
    navigator.vibrate(25)
  }
}

function detectStep(magnitude) {
  const now = Date.now()
  if (magnitude > 1.5 && now - lastStepTime > 240) {
    lastStepTime = now
    addStep()
  }
}

function handleMotion(event) {
  const accel = event.accelerationIncludingGravity
  if (!accel) return
  const magnitude = Math.sqrt(
    accel.x * accel.x +
    accel.y * accel.y +
    accel.z * accel.z
  )

  if (Math.abs(magnitude - lastMotionValue) > 0.8) {
    lastMotionValue = magnitude
    detectStep(magnitude)
  }
}

function enableDemoMode() {
  isDemoMode = true
  if (demoTimer) clearInterval(demoTimer)
  demoTimer = setInterval(() => {
    if (tracking) addStep()
  }, 1200)
}

function startTracking() {
  if (tracking) return
  tracking = true
  startTime = Date.now()
  updateUI()

  if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then((response) => {
        if (response === 'granted') {
          motionSupported = true
          isDemoMode = false
          window.addEventListener('devicemotion', handleMotion)
          statusLabelEl.textContent = 'Sensor active'
        } else {
          enableDemoMode()
        }
      })
      .catch(() => {
        enableDemoMode()
      })
  } else if (window.DeviceMotionEvent) {
    motionSupported = true
    isDemoMode = false
    window.addEventListener('devicemotion', handleMotion)
    statusLabelEl.textContent = 'Sensor active'
  } else {
    enableDemoMode()
  }
}

function pauseTracking() {
  tracking = false
  updateUI()
  if (demoTimer) {
    clearInterval(demoTimer)
    demoTimer = null
  }
  if (motionSupported) {
    window.removeEventListener('devicemotion', handleMotion)
  }
}

function resetTracking() {
  steps = 0
  startTime = null
  lastStepTime = 0
  lastMotionValue = 0
  saveData()
  updateUI()
}

toggleBtn.addEventListener('click', () => {
  if (tracking) pauseTracking()
  else startTracking()
})

startBtn.addEventListener('click', startTracking)
pauseBtn.addEventListener('click', pauseTracking)
resetBtn.addEventListener('click', resetTracking)

window.addEventListener('beforeunload', saveData)

updateUI()
