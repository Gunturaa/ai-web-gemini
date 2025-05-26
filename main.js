import {GoogleGenerativeAI, HarmBlockThreshold, HarmCategory} from '@google/generative-ai'
import MarkdownIt from 'markdown-it'
import './style.css'

// Theme Toggle Functionality
const themeToggle = document.getElementById('theme-toggle')
const html = document.documentElement

// Check for saved theme preference or use preferred color scheme
const savedTheme = localStorage.getItem('theme') || 
                   (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
html.setAttribute('data-theme', savedTheme)

themeToggle.addEventListener('click', () => {
  const currentTheme = html.getAttribute('data-theme')
  const newTheme = currentTheme === 'light' ? 'dark' : 'light'
  html.setAttribute('data-theme', newTheme)
  localStorage.setItem('theme', newTheme)
  
  // Add animation class
  document.body.classList.add('theme-change')
  setTimeout(() => document.body.classList.remove('theme-change'), 500)
})

// Gemini API Implementation
let API_KEY = 'AIzaSyBBd_Lyq2f020Zr6HcT9yRozYX-PfZAInA'

let form = document.querySelector('form')
let promptInput = document.querySelector('input[name="prompt"]')
let output = document.querySelector('.ai-response')
let typingIndicator = document.querySelector('.typing-indicator')

const genAI = new GoogleGenerativeAI(API_KEY)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
  ],
})
const chat = model.startChat({
  history: [],
  generationConfig: {
    maxOutputTokens: 1000000
  }
})

// Fungsi untuk mendeteksi pertanyaan tentang identitas
function isIdentityQuestion(prompt) {
  const identityKeywords = [
    'siapa kamu', 'siapakah kamu', 'siapa anda', 'siapakah anda',
    'who are you', 'what are you', 'perkenalkan dirimu', 'perkenalkan diri anda'
  ]
  
  const lowerPrompt = prompt.toLowerCase()
  return identityKeywords.some(keyword => lowerPrompt.includes(keyword))
}

form.onsubmit = async (ev) => {
  ev.preventDefault()
  const prompt = promptInput.value.trim()
  
  if (!prompt) return
  
  output.innerHTML = ''
  typingIndicator.style.display = 'flex'
  promptInput.disabled = true
  ev.submitter.disabled = true
  
  try {
    // Jika pertanyaan tentang identitas, berikan respon khusus
    if (isIdentityQuestion(prompt)) {
      typingIndicator.style.display = 'none'
      output.innerHTML = `
        <p>Saya adalah <strong style="color: var(--primary)">GunAI</strong>, asisten AI personal yang dikembangkan oleh <span style="color: var(--primary-light)">Guntur Tri Atmaja</span>.</p>
        <p>Saya menggunakan teknologi <span style="color: var(--primary)">Google Gemini API</span> versi terbaru untuk memberikan respons yang akurat dan bermanfaat.</p>
        <p>Silakan ajukan pertanyaan apa pun, saya akan membantu semampu saya!</p>
      `
      return
    }

    const result = await chat.sendMessageStream(prompt)
    
    let buffer = []
    let md = new MarkdownIt()
    
    for await (let response of result.stream) {
      buffer.push(response.text())
      output.innerHTML = md.render(buffer.join(''))
      typingIndicator.style.display = 'none'
      
      // Smooth scroll to bottom
      output.scrollTo({
        top: output.scrollHeight,
        behavior: 'smooth'
      })
    }
  } catch (e) {
    typingIndicator.style.display = 'none'
    output.innerHTML = `
      <p style="color: var(--primary-light)">⚠️ Maaf, terjadi kesalahan:</p>
      <p>${e.message}</p>
      <p>Silakan coba lagi atau refresh halaman.</p>
    `
    console.error('API Error:', e)
  } finally {
    promptInput.disabled = false
    ev.submitter.disabled = false
    promptInput.focus()
  }
}

// Add animation to input on focus
promptInput.addEventListener('focus', () => {
  promptInput.parentElement.classList.add('focused')
})

promptInput.addEventListener('blur', () => {
  promptInput.parentElement.classList.remove('focused')
})

// Initialize with focus on input
promptInput.focus()