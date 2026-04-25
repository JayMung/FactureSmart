import { useComptabiliteAI } from '@/hooks/useComptabiliteAI';

// [COD-56] telegramBotToken supprimé du frontend — passe maintenant par Edge Function server-side
const ComptabiliteAIAgent = () => {
  useComptabiliteAI({
    // [COD-56] telegramChatId reste dans .env (n'est pas une clé secrète)
    telegramChatId: import.meta.env.VITE_TELEGRAM_CHAT_ID,
    maxDaysWithoutReconciliation: 3,
    maxUnrecordedExpenses: 3,
  });
  return null;
};

export default ComptabiliteAIAgent;
