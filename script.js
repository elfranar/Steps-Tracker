const STORAGE_KEYS = {
  steps: 'pulseRun.steps',
  goal: 'pulseRun.goal',
  history: 'pulseRun.history'
}

const DEFAULT_GOAL = 8000
const historyLimit = 6

const stepsCountEl = document.getElementById('stepsCount')
const distanceCountEl = document.getElementById('distanceCount')
const caloriesCountEl = document.getElementById('caloriesCount')
const goalPercentEl = document.getElementById('goalPercent')
const goalTextEl = document.getElementById('goalText')
const paceCountEl = document.getElementById('paceCount')
const modeLabelEl = document.getElementById('modeLabel')
const statusLabelEl = document.getElementById('statusLabel')
const historyListEl = document.getElementById('historyList')
const historySummaryEl = document.getElementById('historySummary')
const toggleBtn = document.getElementById('toggleBtn')
const startBtn = document.getElementById('startBtn')
const pauseBtn = document.getElementById('pauseBtn')
const resetBtn = document.getElementById('resetBtn')
const goalBtn = document.getElementById('goalBtn')
const goalModal = document.getElementById('goalModal')
const closeModalBtn = document.getElementById('closeModalBtn')
const goalInput = document.getElementById('goalInput')
const saveGoalBtn = document.getElementById('saveGoalBtn')

let goal = Number(localStorage.getItem(STORAGE_KEYS.goal) || DEFAULT_GOAL)
let steps = Number(localStorage.getItem(STORAGE_KEYS.steps) || 0)
let tracking = false
let startTime = null
let sessionStartTime = null
let demoMode = false
let motionSupported = false
let demoTimer = null
let lastStepTime = 0
let lastMotionValue = 0
let filteredMagnitude = 0
let history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]')

function saveData() {
  localStorage.setItem(STORAGE_KEYS.steps, String(steps))
  localStorage.setItem(STORAGE_KEYS.goal, String(goal))
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history))
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

function getElapsedSeconds() {
  if (!startTime) return 0
  return Math.max(Math.floor((Date.now() - startTime) / 1000), 0)
}

function getElapsedHours() {
  return getElapsedSeconds() / 3600 || 0.0001
}

function getPace() {
  const distance = getDistance()
  return distance > 0 && getElapsedHours() > 0 ? distance / getElapsedHours() : 0
}

function updateRing(progress) {
  const ring = document.querySelector('.progress-ring')
  const degree = Math.min(Math.max(progress * 3.6, 0), 360)
  ring.style.setProperty('--progress-deg', `${degree}deg`)
}

function renderHistory() {
  historySummaryEl.textContent = `${history.length} session${history.length === 1 ? '' : 's'}`

  if (history.length === 0) {
    historyListEl.innerHTML = '<li><span>No sessions yet</span><small>Start tracking to save activity</small></li>'
    return
  }

  historyListEl.innerHTML = ''

  history.slice(0, historyLimit).forEach((entry) => {
    const li = document.createElement('li')
    li.innerHTML = `
      <div>
        <strong>${formatNumber(entry.steps)} steps</strong>
        <small>${entry.date}</small>
      </div>
      <div>
        <strong>${entry.distance.toFixed(2)} km</strong>
      </div>
    `
    historyListEl.appendChild(li)
  })
}

function updateUI() {
  const distance = getDistance()
  const calories = getCalories()
  const progress = Math.min((steps / goal) * 100, 100)
  const pace = getPace()

  stepsCountEl.textContent = formatNumber(steps)
  distanceCountEl.textContent = `${distance.toFixed(2)} km`
  caloriesCountEl.textContent = `${Math.round(calories)} kcal`
  goalPercentEl.textContent = `${Math.round(progress)}%`
  goalTextEl.textContent = formatNumber(goal)
  paceCountEl.textContent = `${pace.toFixed(1)} km/h`

  updateRing(progress)
  statusLabelEl.textContent = tracking ? 'Tracking' : 'Paused'
  modeLabelEl.textContent = demoMode ? 'Demo mode' : (motionSupported ? 'Sensor mode' : 'Manual mode')
  toggleBtn.textContent = tracking ? 'Pause' : 'Start'
  startBtn.textContent = tracking ? 'Tracking...' : 'Start tracking'

  renderHistory()
}

function addStep() {
  steps += 1
  saveData()
  updateUI()
  if (navigator.vibrate) {
    navigator.vibrate(25)
  }
}

function saveSession(durationSeconds) {
  const sessionDistance = steps * 0.000762
  const sessionCalories = steps * 0.04
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })

  history.unshift({
    date: formattedDate,
    steps,
    distance: sessionDistance,
    calories: sessionCalories,
    duration: durationSeconds
  })

  history = history.slice(0, historyLimit)
  saveData()
  updateUI()
}

function smoothMotionValue(value) {
  if (!filteredMagnitude) {
    filteredMagnitude = value
  } else {
    filteredMagnitude = filteredMagnitude * 0.7 + value * 0.3
  }
  return filteredMagnitude
}

function detectStepFromMotion(value) {
  const now = Date.now()
  const delta = Math.abs(value - lastMotionValue)
  const minGap = now - lastStepTime > 220

  if (delta > 0.95 && minGap) {
    lastStepTime = now
    addStep()
  }

  lastMotionValue = value
}

function handleMotion(event) {
  const accel = event.acceleration || event.accelerationIncludingGravity
  if (!accel) return

  const magnitude = Math.sqrt(
    accel.x * accel.x +
    accel.y * accel.y +
    accel.z * accel.z
  )

  const smoothValue = smoothMotionValue(magnitude)
  detectStepFromMotion(smoothValue)
}

function enableDemoMode() {
  demoMode = true
  if (demoTimer) clearInterval(demoTimer)
  demoTimer = setInterval(() => {
    if (tracking) addStep()
  }, 1100)
}

function setupMotionTracking() {
  if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then((response) => {
        if (response === 'granted') {
          motionSupported = true
          demoMode = false
          window.addEventListener('devicemotion', handleMotion, { passive: true })
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
    demoMode = false
    window.addEventListener('devicemotion', handleMotion, { passive: true })
    statusLabelEl.textContent = 'Sensor active'
  } else {
    enableDemoMode()
  }
}

function startTracking() {
  if (tracking) return

  tracking = true
  startTime = Date.now()
  sessionStartTime = startTime
  lastStepTime = 0
  lastMotionValue = 0
  filteredMagnitude = 0
  updateUI()
  setupMotionTracking()
}

function pauseTracking() {
  if (!tracking) return

  tracking = false
  const duration = getElapsedSeconds()
  if (duration > 0) {
    saveSession(duration)
  }
  if (demoTimer) {
    clearInterval(demoTimer)
    demoTimer = null
  }
  if (motionSupported) {
    window.removeEventListener('devicemotion', handleMotion)
  }
  startTime = null
  sessionStartTime = null
  updateUI()
}

function resetTracking() {
  steps = 0
  startTime = null
  sessionStartTime = null
  lastStepTime = 0
  lastMotionValue = 0
  filteredMagnitude = 0
  saveData()
  updateUI()
}

function openGoalModal() {
  goalInput.value = goal
  goalModal.classList.add('open')
}

function closeGoalModal() {
  goalModal.classList.remove('open')
}

function saveGoal() {
  const newGoal = Math.max(1000, Number(goalInput.value) || DEFAULT_GOAL)
  goal = newGoal
  saveData()
  updateUI()
  closeGoalModal()
}

for (const btn of document.querySelectorAll('.preset-btn')) {
  btn.addEventListener('click', () => {
    goalInput.value = btn.dataset.goal
  })
}

toggleBtn.addEventListener('click', () => {
  if (tracking) pauseTracking()
  else startTracking()
})

startBtn.addEventListener('click', startTracking)
pauseBtn.addEventListener('click', pauseTracking)
resetBtn.addEventListener('click', resetTracking)
goalBtn.addEventListener('click', openGoalModal)
closeModalBtn.addEventListener('click', closeGoalModal)
saveGoalBtn.addEventListener('click', saveGoal)
goalModal.addEventListener('click', (event) => {
  if (event.target === goalModal) {
    closeGoalModal()
  }
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeGoalModal()
  }
})

window.addEventListener('beforeunload', saveData)

updateUI()
openGoalModal()
