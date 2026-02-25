import React, { useState } from "react";
import { Sparkles, Smile, Battery, MessageCircle, Heart, Moon, Sun, Coffee, Zap, Wind, Trash2, CheckCircle, User } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [energyData, setEnergyData] = useState([]);
  const [showForm, setShowForm] = useState(false);
const handleFormSubmit = (e) => {
  e.preventDefault();
 
  alert("Your consultation request has been sent to Dr. Aris!");
  setShowForm(false);
};
  const quickMoods = [
    { label: "Energized", icon: <Zap size={18} />, prompt: "I'm feeling super energized and ready to take on the day!" },
    { label: "Stressed", icon: <Wind size={18} />, prompt: "I've had a really stressful day at work and need to unwind." },
    { label: "Tired", icon: <Battery size={18} />, prompt: "My energy levels are low, I feel quite exhausted." },
    { label: "Calm", icon: <Moon size={18} />, prompt: "I'm feeling very peaceful and mindful right now." },
    { label: "Anxious", icon: <Sparkles size={18} />, prompt: "I'm feeling a bit anxious about upcoming events." },
    { label: "Low", icon: <Heart size={18} />, prompt: "I'm feeling a bit down and could use some encouragement." },
  ];
  const moodThemes = {
  energized: "linear-gradient(135deg, #fff9c4 0%, #ffeb3b 100%)",
  stressed: "linear-gradient(135deg, #f3e5f5 0%, #ce93d8 100%)",
  tired: "linear-gradient(135deg, #eceff1 0%, #b0bec5 100%)",
  calm: "linear-gradient(135deg, #e8f5e9 0%, #81c784 100%)",
  happy: "linear-gradient(135deg, #fff3e0 0%, #ffb74d 100%)",
  anxious: "linear-gradient(135deg, #e1f5fe 0%, #4fc3f7 100%)",
  default: "linear-gradient(135deg, #e0f7fa 0%, #e8f5e9 100%)"
};
  const [currentTheme, setCurrentTheme] = useState(moodThemes.Default);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
const [isPrescriptionLoading, setIsPrescriptionLoading] = useState(false);

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
setPreviewImage(URL.createObjectURL(file)); 
    if (!file) return;

    setIsLoading(true); 

    
    setTimeout(() => {
        const dummyData = {
            diagnosis: "Seasonal Allergic Rhinitis & Vitamin D Deficiency",
            medicines: [
                "Cetirizine 10mg - Once daily (Evening)",
                "Vitamin D3 60,000 IU - Once weekly",
                "Nasal Saline Spray - As needed"
            ],
            dietary_advice: "Increase intake of citrus fruits and fatty fish. Avoid dairy late at night to reduce congestion.",
            warnings: "May cause drowsiness. Do not drive after taking Cetirizine."
        };

        setPrescriptionData(dummyData);
        setIsLoading(false); 
    }, 2000); 
};
  const sendMessage = async (textOverride) => {
    const messageToSend = textOverride || input;
    if (!messageToSend.trim() || isLoading) return;

    setMessages((prev) => [...prev, { sender: "user", text: messageToSend }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageToSend })
      });

      const result = await response.json();

      const aiData = result?.data;

      const detectedMood = aiData?.mood?.toLowerCase(); 
console.log("Detected Mood:", detectedMood); 

if (detectedMood && moodThemes[detectedMood]) {
    setCurrentTheme(moodThemes[detectedMood]);
} else {
    setCurrentTheme(moodThemes.default);
}

      if (aiData.energy_score) {
        const newDataPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          score: aiData.energy_score
        };
        setEnergyData(prev => [...prev, newDataPoint]);
      }
      
      const displayText = aiData?.summary || aiData?.message || "I'm here to help, but I didn't get a clear summary.";

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: displayText,
          stats: aiData
        }
      ]);

    } catch (error) {
      console.error("Fetch Error:", error);
      setMessages((prev) => [...prev, { sender: "bot", text: "Connection error. Check if your Python server is running!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => setMessages([]);

  return (
  <div className="theme-wrapper" style={{ background: currentTheme, transition: 'background 1.5s ease' }}>
    <div className="app-layout">
      <aside className="sidebar">
        <div className="energy-meter-container">
          <div className="meter-header">
            <h4>Current Energy</h4>
            <span className="energy-value">{energyData[energyData.length - 1]?.score || 0}/10</span>
          </div>
          <div className="meter-bar-bg">
            <div
              className="meter-bar-fill"
              style={{ width: `${(energyData[energyData.length - 1]?.score || 0) * 10}%` }}
            ></div>
          </div>
          <p className="meter-subtitle">Tracking your wellness momentum</p>
        </div>
        <div className="doctor-card">
  <div className="doc-info">
    <div className="doc-avatar">👨‍⚕️</div>
    <div>
      <h5>Dr. Aris V.</h5>
      <p>Wellness Consultant</p>
    </div>
  </div>
  <button className="consult-btn" onClick={() => setShowForm(true)}>
    Consult Expert
  </button>
</div>
        <div className="sidebar-header">
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
        <button className="clear-btn" onClick={clearChat}>
          <Trash2 size={16} /> Clear Chat
        </button>
      </aside>

      <main className="chat-container">
        <header className="chat-header">🌿 Wellness Companion</header>
        <div className="chat-box">
          {isPrescriptionLoading && (
    <div className="prescription-results loading">
        <div className="typing">🔍 Scanning prescription details...</div>
    </div>
)}

{prescriptionData && !isPrescriptionLoading && (
    <div className="prescription-results">
        {/* ... the results card we built earlier ... */}
    </div>
)}
          {messages.map((msg, index) => (
            <div key={index} className={`message-wrapper ${msg.sender}`}>
              {msg.sender === 'bot' && msg.stats?.is_personal && (
                <div className="verified-badge">
                  <CheckCircle size={12} /> Verified Personal Record
                </div>
              )}
              <div className="message-content">
                <p>{msg.text}</p>

               
                {msg.steps && (
                  <div className="steps-container">
                    <strong>Try this:</strong>
                    <ul>
                      {msg.steps.map((step, i) => <li key={i}>{step}</li>)}
                    </ul>
                  </div>
                )}

                {msg.sender === "bot" && msg.stats && (
                  <div className="wellness-stats">
                    <div className="stat-pill">Mood: {msg.stats.mood}</div>
                    <div className="stat-pill">Energy: {msg.stats.energy_score}/10</div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && <div className="typing">AI is analyzing context...</div>}
        </div>
          {showForm && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>Consult with Dr. Aris</h3>
      <p>Your recent mood data and chat summary will be attached.</p>
      <form onSubmit={handleFormSubmit}>
        <label>Urgency Level</label>
        <select><option>Low</option><option>Medium</option><option>High</option></select>
        
        <label>Additional Notes</label>
        <textarea placeholder="Tell the doctor more about how you feel..."></textarea>
        
        <div className="modal-actions">
          <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
          <button type="submit" className="submit-btn">Send to Doctor</button>
        </div>
      </form>
    </div>
  </div>
)}
        <div className="input-box">
          <input
            value={input}
            placeholder="Type your own mood..."
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
        
<div className="upload-section">
  <label className="upload-btn">
    <input type="file" onChange={handleFileUpload} hidden accept="image/*" />
    Upload Prescription 💊
  </label>
</div>


          <button onClick={() => sendMessage()}>Send</button>
        </div>
      </main>

      {prescriptionData && (
  <div className="prescription-container">
    <div className="prescription-layout-split">
      
      {/* Left Side: The Image */}
      <div className="prescription-image-preview">
        <div className="preview-tag">ORIGINAL SCAN</div>
        <img src={previewImage} alt="Prescription" />
      </div>

      {/* Right Side: The AI Analysis */}
      <div className="prescription-analysis-data">
        <div className="analysis-header">
          <CheckCircle size={20} color="#4caf50" />
          <h3>AI Analysis Result</h3>
        </div>

        <div className="res-section">
          <strong>Diagnosis</strong>
          <p>{prescriptionData.diagnosis}</p>
        </div>

        <div className="res-section">
          <strong>Medications</strong>
          <div className="med-pills">
            {prescriptionData.medicines.map((m, i) => (
              <span key={i} className="med-pill">💊 {m}</span>
            ))}
          </div>
        </div>

        <div className="res-section">
          <strong>Nutrition Advice</strong>
          <div className="food-box">🍎 {prescriptionData.dietary_advice}</div>
        </div>
      </div>
      
    </div>
  </div>
)}

    </div>
  </div>
  );
}

export default App;