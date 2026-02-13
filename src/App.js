import React, { useState } from "react";
import axios from "axios";
import { Sparkles, Smile, Battery, MessageCircle, Heart, Moon, Sun, Coffee, Zap, Wind } from "lucide-react"; // Modern Icons
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const quickMoods = [
    { label: "Energized", icon: <Zap size={18}/>, prompt: "I'm feeling super energized and ready to take on the day!" },
    { label: "Stressed", icon: <Wind size={18}/>, prompt: "I've had a really stressful day at work and need to unwind." },
    { label: "Tired", icon: <Battery size={18}/>, prompt: "My energy levels are low, I feel quite exhausted." },
    { label: "Calm", icon: <Moon size={18}/>, prompt: "I'm feeling very peaceful and mindful right now." },
    { label: "Productive", icon: <Coffee size={18}/>, prompt: "I've been very productive today and feel proud." },
    { label: "Anxious", icon: <Sparkles size={18}/>, prompt: "I'm feeling a bit anxious about upcoming events." },
    { label: "Happy", icon: <Smile size={18}/>, prompt: "Everything is going great, I'm in a wonderful mood!" },
    { label: "Low", icon: <Heart size={18}/>, prompt: "I'm feeling a bit down and could use some encouragement." },
    { label: "Focused", icon: <Sun size={18}/>, prompt: "I'm in deep focus mode and want to maintain this state." },
    { label: "Social", icon: <MessageCircle size={18}/>, prompt: "I'm feeling very social and chatty today." },
  ];

  const sendMessage = async (textOverride) => {
    const messageToSend = textOverride || input;
    if (!messageToSend.trim() || isLoading) return;

    setMessages((prev) => [...prev, { sender: "user", text: messageToSend }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await axios.post("/api/chat",{ message: messageToSend });
      setMessages((prev) => [...prev, { sender: "bot", text: res.data.data.summary, stats: res.data.data }]);
    } catch (error) {
      setMessages((prev) => [...prev, { sender: "bot", text: "Connection error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>Mood Presets</h3>
          <p>Quick start your session</p>
        </div>
        <div className="mood-grid">
          {quickMoods.map((mood, i) => (
            <button key={i} className="mood-card" onClick={() => sendMessage(mood.prompt)}>
              <span className="mood-icon">{mood.icon}</span>
              <span className="mood-label">{mood.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN CHAT */}
      <main className="chat-container">
        <header className="chat-header">🌿 Wellness Companion</header>
        <div className="chat-box">
          {messages.map((msg, index) => (
            <div key={index} className={`message-wrapper ${msg.sender}`}>
              <div className="message-content">
                {msg.text}
                {msg.sender === "bot" && msg.stats && (
                  <div className="wellness-stats">
                    <div className="stat-pill">Mood: {msg.stats.mood}</div>
                    <div className="stat-pill">Energy: {msg.stats.energy_score}/10</div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && <div className="typing">AI is analyzing...</div>}
        </div>

        <div className="input-box">
          <input 
            value={input} 
            placeholder="Type your own mood..." 
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={() => sendMessage()}>Send</button>
        </div>
      </main>
    </div>
  );
}

export default App;