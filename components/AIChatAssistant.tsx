import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useData } from '../DataContext';
import { ChatMessage } from '../types';

const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const lines = formattedText.split('\n');
    const content = [];
    let listItems: string[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            content.push(
                <ul key={`ul-${content.length}`}>
                    {listItems.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: item }} />)}
                </ul>
            );
            listItems = [];
        }
    };

    for (const line of lines) {
        if (line.trim().startsWith('* ')) {
            listItems.push(line.trim().substring(2));
        } else {
            flushList();
            if (line.trim()) {
                content.push(<p key={`p-${content.length}`} dangerouslySetInnerHTML={{ __html: line }} />);
            }
        }
    }
    flushList();

    return <>{content}</>;
};

const AIChatAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'model',
            content: 'Merhaba! Ben Analiz Asistanı. Verilerinizle ilgili neyi merak ediyorsunuz?'
        }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { storeData, comments, getManagerForStore } = useData();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if(isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const newUserMessage: ChatMessage = { role: 'user', content: userInput.trim() };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            if (!process.env.API_KEY) {
                throw new Error("API anahtarı yapılandırılmamış.");
            }

            const storeDataSummary = storeData.map(s => ({ 
                name: s.name, 
                yonetici: getManagerForStore(s.name) || 'Atanmamış', 
                satisfaction: s.satisfaction, 
                feedbackCount: s.feedbackCount,
                aylikTurnoverOranlari: s.turnoverHistory,
            }));

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `Sen, "Analiz Asistanı" adlı, bir İK veri analizi konusunda uzman bir yapay zekasın. Görevin, sana sunulan mağaza, çalışan yorumu ve turnover verilerini analiz ederek kullanıcının sorularını Türkçe olarak yanıtlamaktır.

**Yeteneklerin:**
- Mağaza performanslarını karşılaştırabilirsin (örn: "En düşük memnuniyete sahip 3 mağaza hangisi?").
- **Yönetici Bazlı Analiz:** Belirli bir yöneticiye ("Bölge Müdürü") bağlı mağazalardaki sorunları özetleyebilirsin. Kullanıcı "Kemal Gülcan bölgesi" veya "Kemal Gülcan'ın mağazaları" gibi bir ifade kullandığında, bu ifadenin "yonetici" alanı "Kemal Gülcan" olan mağazaları analiz etmek anlamına geldiğini anlamalısın.
- Yorumlardaki ana temaları ve kategorileri analiz edebilirsin (örn: "Yönetimle ilgili olumsuz yorumları listele.").
- **Turnover Analizi:** Bir mağazanın yüksek turnover oranlarını, olumsuz geri bildirim kategorileriyle (örn: 'Yönetim & Liderlik') ilişkilendirerek daha derin analizler sunabilirsin.
- **Tekil Mağaza Bilgisi:** Eğer kullanıcı belirli bir mağazanın adını vererek bilgi isterse (örn: "Kadıköy Mağazası nasıl gidiyor?"), o mağazanın verilerini (yonetici, memnuniyet, geri bildirim sayısı, turnover oranları vb.) özetleyerek sunabilirsin.
- Verilere dayanarak basit çıkarımlar yapabilirsin.

**Kurallar:**
1.  **Veriye Sadık Kal:** Cevaplarını *yalnızca* sana sunulan JSON verilerine dayandır. Veri dışı bilgi verme. Özellikle, sana sağlanmayan "bölge" gibi coğrafi bilgilere dair yorum yapma. Analizlerin mağaza adı ve yöneticisi temelinde olmalıdır.
2.  **Bağlamı Kullan:** Kullanıcının sorduğu soruları, \`KONUŞMA GEÇMİŞİ\`'ni dikkate alarak yanıtla.
3.  **Anlaşılır Ol:** Cevaplarını açık, profesyonel ve anlaşılır bir dilde sun.
4.  **Okunaklı Formatlama:** Cevaplarını daha okunaklı hale getirmek için Markdown formatlamasını kullan. Listeler için her maddeye yeni bir satırda yıldız ve bir boşluk ile başla (örn: \`* Madde 1\`). Önemli kelimeleri veya başlıkları çift yıldız ile kalın yap (örn: \`**Önemli Başlık**\`).

---
**SANA SAĞLANAN VERİLER:**
**Mağaza Verileri (Yönetici ve Turnover dahil):** ${JSON.stringify(storeDataSummary)}
**Çalışan Yorumları:** ${JSON.stringify(comments.map(c => ({store: c.store, text: c.text, sentiment: c.sentiment, category: c.category, date: c.date})))}

---
**KONUŞMA GEÇMİŞİ:**
${messages.map(m => `${m.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${m.content}`).join('\n')}

---
**YENİ SORU:**
**Kullanıcı:** ${userInput.trim()}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const aiResponse: ChatMessage = { role: 'model', content: response.text };
            setMessages(prev => [...prev, aiResponse]);

        } catch (error) {
            console.error("AI Chat Error:", error);
            const errorMessage: ChatMessage = {
                role: 'model',
                content: 'Üzgünüm, bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ai-chat-container">
            <div className={`ai-chat-window ${isOpen ? 'open' : 'closed'}`}>
                <div className="ai-chat-header">
                    <div className="ai-chat-title-group">
                        <span className="material-symbols-outlined ai-icon">auto_awesome</span>
                        <h3 className="ai-chat-title">Analiz Asistanı</h3>
                    </div>
                    <button className="ai-chat-close-btn" onClick={() => setIsOpen(false)} aria-label="Kapat">
                         <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="ai-chat-messages-container">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message-bubble ${msg.role === 'user' ? 'user-message' : 'model-message'}`}>
                             {msg.role === 'model' ? <FormattedMessage text={msg.content} /> : msg.content}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message-bubble model-message">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="ai-chat-input-area">
                    <form onSubmit={handleSendMessage} className="ai-chat-input-form">
                        <input
                            type="text"
                            className="ai-chat-input"
                            placeholder="Bir soru sorun..."
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            disabled={isLoading}
                        />
                        <button type="submit" className="ai-chat-send-btn" disabled={isLoading || !userInput.trim()}>
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </form>
                </div>
            </div>
            <button className="ai-chat-fab" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? "Asistanı Kapat" : "Asistanı Aç"}>
                <span className="material-symbols-outlined">{isOpen ? 'close' : 'auto_awesome'}</span>
            </button>
        </div>
    );
};

export default AIChatAssistant;