import mongoose from 'mongoose';
import Session from '../models/Session.js';
import Feedback from '../models/Feedback.js';
import Answer from '../models/Answer.js';
import { memorySessions, memoryAnswers, memoryFeedback } from './sessionController.js';

// @desc Get aggregated user analytics metrics for dashboard charts
// @route GET /api/analytics/dashboard
export const getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const objectUserId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    let scoreTrend = [];
    let skillScores = [];
    let weakTopics = [];
    let totalSessions = 0;
    let avgScore = 0;
    let totalAnswers = 0;

    try {
      // 1. Fetch user sessions efficiently
      const userSessions = await Session.find({ user: objectUserId })
        .select('_id status overallScore targetRole interviewType createdAt')
        .lean();

      const completedSessions = userSessions.filter((s) => s.status === 'completed');
      totalSessions = completedSessions.length;
      if (totalSessions > 0) {
        const sum = completedSessions.reduce((acc, s) => acc + (s.overallScore || 0), 0);
        avgScore = Number((sum / totalSessions).toFixed(1));
      }

      // 2. Score Trend Line Across Sessions
      scoreTrend = completedSessions
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map((s) => ({
          date: s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : 'N/A',
          score: s.overallScore,
          role: s.targetRole,
          type: s.interviewType,
        }));

      // 3. Category & Weakness Aggregations using direct index match
      const sessionIds = userSessions.map((s) => s._id);
      if (sessionIds.length > 0) {
        const categoryAggregation = await Feedback.aggregate([
          { $match: { session: { $in: sessionIds } } },
          {
            $group: {
              _id: '$category',
              avgCategoryScore: { $avg: '$score' },
              count: { $sum: 1 },
            },
          },
          { $sort: { avgCategoryScore: -1 } },
        ]);

        skillScores = categoryAggregation.map((item) => ({
          skill: item._id || 'General',
          score: Number(item.avgCategoryScore.toFixed(1)),
          fullMark: 10,
        }));

        const weaknessAggregation = await Feedback.aggregate([
          { $match: { session: { $in: sessionIds } } },
          { $unwind: '$weaknesses' },
          {
            $group: {
              _id: '$weaknesses',
              frequency: { $sum: 1 },
              avgScore: { $avg: '$score' },
            },
          },
          { $sort: { frequency: -1 } },
          { $limit: 6 },
        ]);

        weakTopics = weaknessAggregation.map((item) => ({
          topic: item._id,
          frequency: item.frequency,
          avgScore: Number(item.avgScore.toFixed(1)),
        }));
      }

      // 4. Total Answers Count
      totalAnswers = await Answer.countDocuments({ user: objectUserId });
    } catch (dbErr) {
      console.log('[Analytics Aggregation DB Fallback]', dbErr.message);
    }

    // In-memory fallback calculation if DB aggregations returned empty results
    if (scoreTrend.length === 0) {
      const userMemSessions = memorySessions.filter(
        (s) => String(s.user) === String(userId) && s.status === 'completed'
      );
      if (userMemSessions.length > 0) {
        totalSessions = userMemSessions.length;
        const scoreSum = userMemSessions.reduce((acc, s) => acc + (s.overallScore || 0), 0);
        avgScore = Number((scoreSum / totalSessions).toFixed(1));

        scoreTrend = userMemSessions.map((s, idx) => ({
          date: s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : `Session ${idx + 1}`,
          score: s.overallScore || 0,
          role: s.targetRole || 'Software Engineer',
          type: s.interviewType || 'technical',
        }));

        const userMemAnswers = memoryAnswers.filter((a) => String(a.user) === String(userId));
        totalAnswers = userMemAnswers.length;

        const userMemSessionIds = new Set(
          memorySessions.filter((s) => String(s.user) === String(userId)).map((s) => String(s._id || s.id))
        );
        const userMemFeedback = memoryFeedback.filter((f) => userMemSessionIds.has(String(f.session)));

        if (userMemFeedback.length > 0) {
          const catMap = {};
          const weaknessMap = {};

          userMemFeedback.forEach((fb) => {
            const cat = fb.category || 'General';
            if (!catMap[cat]) catMap[cat] = { sum: 0, count: 0 };
            catMap[cat].sum += fb.score || 0;
            catMap[cat].count += 1;

            if (Array.isArray(fb.weaknesses)) {
              fb.weaknesses.forEach((w) => {
                if (!weaknessMap[w]) weaknessMap[w] = { frequency: 0, sum: 0 };
                weaknessMap[w].frequency += 1;
                weaknessMap[w].sum += fb.score || 0;
              });
            }
          });

          skillScores = Object.keys(catMap).map((cat) => ({
            skill: cat,
            score: Number((catMap[cat].sum / catMap[cat].count).toFixed(1)),
            fullMark: 10,
          }));

          weakTopics = Object.keys(weaknessMap).map((w) => ({
            topic: w,
            frequency: weaknessMap[w].frequency,
            avgScore: Number((weaknessMap[w].sum / weaknessMap[w].frequency).toFixed(1)),
          }));
        }
      }
    }

    // If candidate has completed 0 sessions, return genuine empty metrics instead of fabricating data
    if (scoreTrend.length === 0) {
      return res.json({
        summary: {
          totalSessions: 0,
          avgScore: 0,
          totalAnswers: 0,
          readinessLevel: 'Not Started',
        },
        scoreTrend: [],
        skillScores: [],
        weakTopics: [],
      });
    }

    res.json({
      summary: {
        totalSessions,
        avgScore,
        totalAnswers,
        readinessLevel: avgScore >= 8 ? 'Interview Ready' : avgScore >= 6.5 ? 'Proficient' : 'Needs Practice',
      },
      scoreTrend,
      skillScores,
      weakTopics,
    });
  } catch (error) {
    console.error('[Analytics Error]', error);
    res.status(500).json({ message: error.message || 'Failed to generate analytics dashboard.' });
  }
};
