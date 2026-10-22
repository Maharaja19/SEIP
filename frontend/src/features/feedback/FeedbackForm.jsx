import React, { useState } from 'react';
import api from '../../utils/api';

const FeedbackForm = ({ eventId }) => {
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/features/feedback', { eventId, rating, comments });
      if (response.status === 200 || response.status === 201) {
        setStatus({ type: 'success', message: 'Feedback submitted successfully!' });
        setComments('');
      } else {
        setStatus({ type: 'error', message: 'Failed to submit feedback.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || err.response?.data?.message || 'An error occurred during submission.' });
    }
  };

  return (
    <div className="p-6 rounded-xl bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 shadow-xl max-w-md mx-auto">
      <h3 className="text-2xl font-bold text-white mb-6">Leave Feedback</h3>
      {status.message && (
        <div className={`p-3 mb-4 rounded-lg text-sm ${status.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
          {status.message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Rating</label>
          <select 
            value={rating} 
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            {[5, 4, 3, 2, 1].map(r => (
              <option key={r} value={r}>{r} Star{r !== 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Comments</label>
          <textarea 
            rows="4" 
            value={comments} 
            onChange={(e) => setComments(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-500"
            placeholder="Tell us what you thought..."
            required
          />
        </div>
        <button 
          type="submit"
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-medium transition-all transform hover:scale-[1.02] shadow-lg"
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;
