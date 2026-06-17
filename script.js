const goal = 8000
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

let steps = Number(localStorage.getItem('steps') || 0)
let distance = 0
let calories = 0
let tracking = false
let demoMode = false
let lastStepTime = 0
let motionSupported = false
let demoTimer = null
let lastMotionValue = 0

function saveData() {
  localStorage.setItem('steps', String(steps))
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

function calculateDistance() {
  return steps * 0.000762
}

function calculateCalories() {
  return steps * 0.04
}

function updateUI() {
  distance = calculateDistance()
  calories = calculateCalories()

  const progress = Math.min((steps / goal) * 100, 100)
  const pace = steps > 0 ? (distance * 60 * 60) / Math.max(1, Math.floor((Date.now() - 1000) / 1000)) : 0

  stepsCountEl.textContent = formatNumber(steps)
  distanceCountEl.textContent = `${distance.toFixed(2)} km`
  caloriesCountEl.textContent = `${Math.round(calories)} kcal`
  goalPercentEl.textContent = `${Math.round(progress)}%`
  paceCountEl.textContent = `${pace.toFixed(1)} km/h`

  document.querySelector('.progress-ring').style.background = `radial-gradient(circle at center, #0b1120 58%, transparent 59%), conic-gradient(var(--accent) 0deg, var(--accent-2) ${Math.min(progress * 3.6, 360)}deg, var(--warning) 360deg)`

  statusLabelEl.textContent = tracking ? 'Tracking' : 'Paused'
  modeLabelEl.textContent = demoMode ? 'Demo mode' : (motionSupported ? 'Sensor mode' : 'Manual mode')
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

function detectStep(value) {
  const now = Date.now()
  if (value > 1.5 && now - lastStepTime > 240) {
    lastStepTime = now
    addStep()
  }
}

function handleMotion(event) {
  const accel = event.accelerationIncludingGravity
  if (!accel) return
  const magnitude = Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z)
  if (Math.abs(magnitude - lastMotionValue) > 0.8) {
    lastMotionValue = magnitude
    detectStep(magnitude)
  }
}

function enableDemoMode() {
  demoMode = true
  statusLabelEl.textContent = 'Demo'
  if (demoTimer) clearInterval(demoTimer)
  demoTimer = setInterval(() => {
    if (tracking) addStep()
  }, 1200)
}

function startTracking() {
  if (tracking) return
  tracking = true
  updateUI()

  if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then((response) => {
        if (response === 'granted') {
          motionSupported = true
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
  saveData()
  updateUI()
}

toggleBtn.addEventListener('click', () => {
  if (tracking) {
    pauseTracking()
  } else {
    startTracking()
  }
})

startBtn.addEventListener('click', startTracking)
pauseBtn.addEventListener('click', pauseTracking)
resetBtn.addEventListener('click', resetTracking)

updateUI()
