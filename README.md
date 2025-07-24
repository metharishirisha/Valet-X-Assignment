# 🚗 Intelligent Valet System

An AI-powered valet dispatch system for large malls, designed to **predict the user’s intended exit gate** and **dispatch the vehicle automatically**, reducing wait times and optimizing valet workflows.

---

## 📌 Overview

The Intelligent Valet System leverages real-time location tracking (BLE, Wi-Fi, GPS, IMU) and a **probabilistic scoring algorithm** to determine where the user is heading. Once confidence passes a threshold, the car is dispatched to that gate **without requiring user input**.

---

## 🧠 Core Features

- **Real-time Exit Gate Prediction**
  - Uses BLE beacon signals, Wi-Fi triangulation, IMU direction vectors, and GPS.
  - Predicts the user’s most likely exit gate using a scoring model.
  
- **Automatic Vehicle Dispatch**
  - Dispatch triggers once confidence exceeds 90% for 10 seconds.
  - Dynamic redirection if the user changes direction mid-walk.

- **Fail-Safe Sensor Fusion**
  - BLE → Wi-Fi → IMU → GPS fallback chain in case of signal loss.

- **Valet Dashboard**
  - Shows live vehicle queue, dispatch events, gate-level congestion, and user movement across the mall.

---

## ⚙️ Scoring Algorithm

```ts
Score = (0.4 * Proximity) + (0.4 * VectorAlignment) + (0.2 * DwellTime);
Proximity: Inverse distance to gate from BLE triangulation.

VectorAlignment: Dot product of user direction vector with vector to gate.

DwellTime: Time spent inside geofence near gate.

Dispatch is triggered when:

ts
if (Score > 90 && sustained_for_10s) {
   dispatchCarTo(gate);
}
🧩 System Architecture
less

[User Device] --(Sensor Data)--> [Inference Engine] --> [Dispatch Manager] --> [Valet Ops Dashboard]
       |                              |
   BLE, Wi-Fi, IMU, GPS       Scoring Algorithm
Frontend: Vite + React + TypeScript + Tailwind CSS

Backend: Node.js (Express) inference engine

Comms: WebSockets or MQTT for real-time updates

🖥️ Valet Operations Dashboard
Live user tracking on indoor map

Confidence scores per gate

Sensor health and fallback indicators

Queue management for valet teams

🧪 Edge Case Handling
Scenario	Response
Signal loss	Sensor fallback or "Wait & Resume"
User reverses direction	Car redirection or user alert
Stationary user	No dispatch until movement
Congested gates	Weighted penalty (future phase)

📂 Folder Structure
csharp

📁 intelligent-valet/
├── public/
├── src/
│   ├── components/         # React components
│   ├── hooks/              # Sensor + logic hooks
│   ├── services/           # Backend API / socket logic
│   ├── assets/             # Images, beacon maps, etc
│   └── App.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── README.md
🚀 Getting Started

git clone https://github.com/yourusername/intelligent-valet.git
cd intelligent-valet
npm install
npm run dev

🧭 Future Enhancements
Congestion-aware dispatch rerouting

User behavior profiling over time

Integration with parking lot auto-retrieval systems

AI model training based on historical movement data

📞 Contact
For demos or collaboration inquiries:

shirisha methari
Email: metharishirisha7@gmail.com
