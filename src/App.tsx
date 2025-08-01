import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUpload } from './components/FileUpload';
import { EnhancedDashboard } from './components/EnhancedDashboard';
import { Reports } from './components/Reports';
import { EnhancedChatbot } from './components/EnhancedChatbot';
import { Gamification } from './components/Gamification';
import { Navigation } from './components/Navigation';
import { Hero } from './components/Hero';
import { Leaf, MessageCircle } from 'lucide-react';
import { SustainabilityMetrics, Badge, Pledge } from './types/sustainability';
import { GamificationEngine } from './utils/gamification';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [analysisData, setAnalysisData] = useState<SustainabilityMetrics | null>(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [badges] = useState<Badge[]>(
    GamificationEngine.AVAILABLE_BADGES.map(badge => ({
      ...badge,
      earned: false,
      progress: Math.floor(Math.random() * 60) // Simulate progress
    }))
  );
  const [pledges, setPledges] = useState<Pledge[]>([]);

  // REPLACED: Old OCR logic removed. Now POST to backend and update analysisData.
  const handleFileUpload = async (files: File[]) => {
    setUploadedFiles(files);

    if (files.length === 0) return;

    const formData = new FormData();
    formData.append('file', files[0]); // Assuming single file upload
    formData.append('include_summary', 'true'); // Request AI summary

    try {
      const response = await fetch('https://sustainability-analyzer.onrender.com/api/analyze-sustainability-report', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to analyze report');

      const backendData = await response.json();
      console.log('App.tsx: Received backendData:', backendData); // Log received data
      setAnalysisData(backendData); // This will update the Dashboard and Chatbot
    } catch (error) {
      console.error('Error uploading file:', error);
      // Optionally: setAnalysisData(null) or show error to user
    }
  };

  const handleCreatePledge = (pledgeData: Omit<Pledge, 'id' | 'current' | 'status'>) => {
    const newPledge: Pledge = {
      ...pledgeData,
      id: Date.now().toString(),
      current: 0,
      status: 'active'
    };
    setPledges(prev => [...prev, newPledge]);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="relative">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Hero setActiveTab={setActiveTab} />
            </motion.div>
          )}

          {activeTab === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="pt-20 pb-12"
            >
              <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">AI Document Analysis</h1>
                  <p className="text-lg text-gray-600">
                    Upload bills, invoices, and documents for intelligent sustainability analysis
                  </p>
                </div>
                <FileUpload onFileUpload={handleFileUpload} uploadedFiles={uploadedFiles} />
              </div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && analysisData && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="pt-20 pb-12"
            >
              <EnhancedDashboard
                data={analysisData}
                onNavigateToGamification={() => setActiveTab('gamification')}
              />
            </motion.div>
          )}

          {activeTab === 'reports' && analysisData && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="pt-20 pb-12"
            >
              <Reports data={analysisData} />
            </motion.div>
          )}

          {activeTab === 'gamification' && (
            <motion.div
              key="gamification"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="pt-20 pb-12"
            >
              <Gamification
                badges={badges}
                pledges={pledges}
                onCreatePledge={handleCreatePledge}
              />
            </motion.div>
          )}

          {!analysisData && (activeTab === 'dashboard' || activeTab === 'reports' || activeTab === 'gamification') && (
            <motion.div
              key="no-data"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="pt-20 pb-12 flex items-center justify-center min-h-[60vh]"
            >
              <div className="text-center">
                <Leaf className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Data Available</h2>
                <p className="text-gray-600 mb-6">Please upload your documents first to see analysis results</p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Upload Documents
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Chatbot Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowChatbot(!showChatbot)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50"
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>

      {/* Chatbot Modal */}
      <EnhancedChatbot
        isOpen={showChatbot}
        onClose={() => setShowChatbot(false)}
        analysisData={analysisData}
        onFileUpload={handleFileUpload}
      />
    </div>
  );
}

export default App;