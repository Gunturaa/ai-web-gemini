import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai'
import MarkdownIt from 'markdown-it'
import './style.css'

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle')
const html = document.documentElement
const sidebarToggle = document.getElementById('sidebar-toggle')
const sidebar = document.querySelector('.sidebar')
const newChatBtn = document.getElementById('new-chat')
const historyItems = document.getElementById('history-items')

// Theme setup
const savedTheme = localStorage.getItem('theme') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
html.setAttribute('data-theme', savedTheme)

themeToggle.addEventListener('click', () => {
  const currentTheme = html.getAttribute('data-theme')
  const newTheme = currentTheme === 'light' ? 'dark' : 'light'
  html.setAttribute('data-theme', newTheme)
  localStorage.setItem('theme', newTheme)

  document.body.classList.add('theme-change')
  setTimeout(() => document.body.classList.remove('theme-change'), 500)
})

// Sidebar toggle
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active')
})

document.addEventListener('click', (e) => {
  if (window.innerWidth <= 1024 && !sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
    sidebar.classList.remove('active')
  }
})

// Gemini API setup
const API_KEY = 'AIzaSyBBd_Lyq2f020Zr6HcT9yRozYX-PfZAInA'
const genAI = new GoogleGenerativeAI(API_KEY)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
    }
  ]
})

let chatHistory = JSON.parse(localStorage.getItem('gunai_chat_history')) || []
let currentChatId = localStorage.getItem('current_chat_id') || Date.now().toString()
let chatSessions = JSON.parse(localStorage.getItem('gunai_chat_sessions')) || []

const chat = model.startChat({
  history: chatHistory,
  generationConfig: { maxOutputTokens: 1000000 }
})

// DOM elements
const form = document.querySelector('form')
const promptInput = document.querySelector('input[name="prompt"]')
const output = document.querySelector('.ai-response')
const typingIndicator = document.querySelector('.typing-indicator')

// Save chat
function saveChatHistory() {
  localStorage.setItem('gunai_chat_history', JSON.stringify(chatHistory))
  const existingIndex = chatSessions.findIndex(session => session.id === currentChatId)
  const firstMsg = chatHistory[0]?.parts[0]?.text || 'Percakapan Baru'
  const title = firstMsg.length > 30 ? firstMsg.slice(0, 30) + '...' : firstMsg
  const sessionData = {
    id: currentChatId,
    title,
    lastUpdated: new Date().toISOString(),
    history: chatHistory
  }

  if (existingIndex !== -1) {
    chatSessions[existingIndex] = sessionData
  } else {
    chatSessions.unshift(sessionData)
  }

  localStorage.setItem('gunai_chat_sessions', JSON.stringify(chatSessions))
  renderChatSessions()
}

function clearCurrentChat() {
  chatHistory = []
  currentChatId = Date.now().toString()
  localStorage.setItem('gunai_chat_history', JSON.stringify(chatHistory))
  localStorage.setItem('current_chat_id', currentChatId)
  output.innerHTML = '<p class="history-cleared">Mulai percakapan baru dengan GunAI.</p>'
}

function loadChatSession(chatId) {
  const session = chatSessions.find(s => s.id === chatId)
  if (session) {
    chatHistory = session.history || []
    currentChatId = session.id
    localStorage.setItem('gunai_chat_history', JSON.stringify(chatHistory))
    localStorage.setItem('current_chat_id', currentChatId)
    displayChatHistory()
    renderChatSessions()
  }
}

function deleteChatSession(chatId, e) {
  e.stopPropagation()
  chatSessions = chatSessions.filter(session => session.id !== chatId)
  localStorage.setItem('gunai_chat_sessions', JSON.stringify(chatSessions))
  if (currentChatId === chatId) clearCurrentChat()
  renderChatSessions()
}

function renderChatSessions() {
  chatSessions.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
  historyItems.innerHTML = ''
  chatSessions.forEach(session => {
    const isActive = session.id === currentChatId
    const btn = document.createElement('button')
    btn.className = `history-item ${isActive ? 'active' : ''}`
    btn.innerHTML = `
      <span>${session.title}</span>
      <button class="delete-chat" data-id="${session.id}">×</button>
    `
    btn.addEventListener('click', () => loadChatSession(session.id))
    btn.querySelector('.delete-chat').addEventListener('click', e => deleteChatSession(session.id, e))
    historyItems.appendChild(btn)
  })
}

function displayChatHistory() {
  let historyHTML = ''

  if (chatHistory.length === 0) {
    historyHTML = '<p class="history-cleared">Mulai percakapan baru dengan GunAI.</p>'
  } else {
    const md = new MarkdownIt()
    chatHistory.forEach(msg => {
      if (msg.role === 'user') {
        historyHTML += `<div class="chat-message user-message"><div class="message-content">${msg.parts[0].text}</div></div>`
      } else {
        historyHTML += `<div class="chat-message ai-message"><div class="message-content">${md.render(msg.parts[0].text)}</div></div>`
      }
    })
  }

  output.innerHTML = historyHTML
  output.scrollTo(0, output.scrollHeight)
  renderChatSessions()
}

function isIdentityQuestion(prompt) {
  const identityKeywords = [
    'siapa kamu', 'siapakah kamu', 'siapa anda', 'siapakah anda',
    'who are you', 'what are you', 'perkenalkan dirimu', 'perkenalkan diri anda'
  ]
  return identityKeywords.some(k => prompt.toLowerCase().includes(k))
}

function isGirlfriendQuestion(prompt) {
  const girlfriendKeywords = [
    'siapa pacar guntur', 'pacar guntur tri atmaja', 
    'siti sundari', 'siapa kekasih guntur',
    "who is guntur's girlfriend", "guntur's girlfriend",
    'pasangan guntur', 'kekasih guntur'
  ]
  return girlfriendKeywords.some(k => prompt.toLowerCase().includes(k))
}

newChatBtn.addEventListener('click', () => {
  clearCurrentChat()
  sidebar.classList.remove('active')
})

form.onsubmit = async (ev) => {
  ev.preventDefault()
  const prompt = promptInput.value.trim()
  if (!prompt) return

  const userMessage = { role: 'user', parts: [{ text: prompt }] }
  chatHistory.push(userMessage)
  saveChatHistory()

  output.innerHTML += `<div class="chat-message user-message"><div class="message-content">${prompt}</div></div>`
  typingIndicator.style.display = 'flex'
  promptInput.disabled = true
  ev.submitter.disabled = true
  output.scrollTo(0, output.scrollHeight)

  const md = new MarkdownIt()

  try {
    if (isIdentityQuestion(prompt)) {
      typingIndicator.style.display = 'none'
      const responseText = `Saya adalah **GunAI**, asisten AI personal yang dikembangkan oleh Guntur Tri Atmaja.\nSaya menggunakan teknologi **Google Gemini API** versi terbaru untuk memberikan respons yang akurat dan bermanfaat.`
      const aiMessage = { role: 'model', parts: [{ text: responseText }] }
      chatHistory.push(aiMessage)
      saveChatHistory()
      output.innerHTML += `<div class="chat-message ai-message"><div class="message-content">${md.render(responseText)}</div></div>`
      return
    }

    if (isGirlfriendQuestion(prompt)) {
      typingIndicator.style.display = 'none'
      const responseText = `Pacar Guntur Tri Atmaja adalah **Siti Sundari** ❤️\nMereka adalah pasangan yang sangat harmonis dan saling mendukung.`
      const aiMessage = { role: 'model', parts: [{ text: responseText }] }
      chatHistory.push(aiMessage)
      saveChatHistory()
      output.innerHTML += `<div class="chat-message ai-message"><div class="message-content">${md.render(responseText)}</div></div>`
      return
    }

    const result = await chat.sendMessageStream(prompt)
    let responseText = ''

    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      responseText += chunkText
      output.innerHTML += `<div class="chat-message ai-message"><div class="message-content">${md.render(chunkText)}</div></div>`
    }

    const aiMessage = { role: 'model', parts: [{ text: responseText }] }
    chatHistory.push(aiMessage)
    saveChatHistory()
  } catch (err) {
    console.error('Error:', err)
    output.innerHTML += `<div class="chat-message error-message"><div class="message-content">Terjadi kesalahan. Silakan coba lagi.</div></div>`
  } finally {
    typingIndicator.style.display = 'none'
    promptInput.disabled = false
    ev.submitter.disabled = false
  }
}

// Initial load
displayChatHistory()
