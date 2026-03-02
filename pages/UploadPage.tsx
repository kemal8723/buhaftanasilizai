import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import MainLayout from '../components/MainLayout';
import { useData } from '../DataContext';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

type UploadTab = 'feedback' | 'turnover';

const UploadPage: React.FC = () => {
    const { 
        uploadData, 
        uploadTurnoverData, 
        isProcessing, 
        processingMessage,
        feedbackFileHistory,
        turnoverFileHistory,
        deleteFeedbackFile,
        deleteTurnoverFile,
        currentUser
    } = useData();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<UploadTab>('feedback');

    const [feedbackFile, setFeedbackFile] = useState<File | null>(null);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);
    
    const [turnoverFile, setTurnoverFile] = useState<File | null>(null);
    const [turnoverError, setTurnoverError] = useState<string | null>(null);
    
    const hasUploadPermission = useMemo(() => {
        if (!currentUser) return false;
        const lowerCaseTitle = currentUser.title.toLowerCase();
        
        // As per request: SOMs, Bölge Müdürleri, Direktörler, Head of titles are restricted.
        const restrictedKeywords = ['direktör', 'head of', 'bölge müdürü', 'satış operasyon müdürü'];
        
        for (const keyword of restrictedKeywords) {
            if (lowerCaseTitle.includes(keyword)) {
                return false;
            }
        }
        
        // Other roles (especially other HR roles) have permission.
        return true;
    }, [currentUser]);

    const onFeedbackDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFeedbackFile(acceptedFiles[0]);
            setFeedbackError(null);
        }
    }, []);

    const onTurnoverDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setTurnoverFile(acceptedFiles[0]);
            setTurnoverError(null);
        }
    }, []);

    const { 
        getRootProps: getFeedbackRootProps, 
        getInputProps: getFeedbackInputProps, 
        isDragActive: isFeedbackDragActive,
        open: openFeedbackDialog
    } = useDropzone({ 
        onDrop: onFeedbackDrop, 
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
        multiple: false,
        noClick: true,
        noKeyboard: true,
    } as any);

    const { 
        getRootProps: getTurnoverRootProps, 
        getInputProps: getTurnoverInputProps, 
        isDragActive: isTurnoverDragActive,
        open: openTurnoverDialog
    } = useDropzone({ 
        onDrop: onTurnoverDrop, 
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
        multiple: false,
        noClick: true,
        noKeyboard: true,
    } as any);
    
    const handleUpload = (file: File | null, uploadFunction: (data: any[][], file: File) => Promise<void>, errorSetter: (msg: string | null) => void) => {
        if (!file) return;
        errorSetter(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const processData = async () => {
                try {
                    const arrayBuffer = event.target?.result;
                    if (!arrayBuffer) throw new Error("Dosya okunamadı.");
                    
                    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const dataAsArray: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
                    
                    await uploadFunction(dataAsArray, file);
                    alert('Veriler başarıyla yüklendi!');
                    navigate('/dashboard');
                } catch (err: any) {
                    errorSetter(err.message || 'Dosya işlenirken bir hata oluştu.');
                }
            };
            processData();
        };
        reader.onerror = () => errorSetter('Dosya okunurken bir hata oluştu.');
        reader.readAsArrayBuffer(file);
    };

    return (
        <MainLayout>
            <div className="content-container" style={{maxWidth: '800px', margin: '0 auto'}}>
                <div className="page-header" style={{flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
                    <p className="page-title">Veri Yükleme Merkezi</p>
                    <p className="page-subtitle">Geri bildirim ve turnover verilerinizi XLSX formatında yükleyerek analiz edin.</p>
                </div>
                
                {hasUploadPermission ? (
                    <div className="card upload-card">
                        <div className="upload-tabs">
                            <button 
                                className={`upload-tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
                                onClick={() => setActiveTab('feedback')}
                            >
                                Geri Bildirim Verisi Yükle
                            </button>
                            <button 
                                className={`upload-tab-btn ${activeTab === 'turnover' ? 'active' : ''}`}
                                onClick={() => setActiveTab('turnover')}
                            >
                                Aylık Turnover Verisi Yükle
                            </button>
                        </div>

                        <div className="upload-tab-content">
                            {activeTab === 'feedback' && (
                                <>
                                    <div {...getFeedbackRootProps()} className={`dropzone ${isFeedbackDragActive ? 'active' : ''}`}>
                                        <input {...getFeedbackInputProps()} />
                                        {!feedbackFile ? (
                                            <div className="dropzone-idle">
                                                <span className="material-symbols-outlined dropzone-icon">cloud_upload</span>
                                                <p className="page-subtitle" style={{marginBottom: '0'}}>Dosyayı sürükleyin veya</p>
                                                <button type="button" onClick={openFeedbackDialog} className="btn btn-secondary">Dosya Seç</button>
                                            </div>
                                        ) : (
                                            <div className="file-preview-active">
                                                <div className="file-info">
                                                    <span className="material-symbols-outlined file-icon">description</span>
                                                    <div>
                                                        <span className="file-name">{feedbackFile.name}</span>
                                                        <span className="file-size"> ({(feedbackFile.size / 1024).toFixed(2)} KB)</span>
                                                    </div>
                                                </div>
                                                <div className="file-actions">
                                                    <button onClick={() => handleUpload(feedbackFile, uploadData, setFeedbackError)} className="btn btn-primary" disabled={isProcessing}>
                                                        {isProcessing ? processingMessage : 'Yükle ve Analiz Et'}
                                                    </button>
                                                    <button type="button" onClick={openFeedbackDialog} className="btn btn-secondary" disabled={isProcessing}>
                                                        Değiştir
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="dropzone-instructions">
                                        Gerekli sütunlar: <strong>Mağaza Adı, Yorum, Puan, Tarih</strong>. 
                                        Filtreleme için <strong>Hafta, Ay</strong> sütunlarını ekleyebilirsiniz. Dosyada <strong>BM</strong> bilgisi bulunmalıdır.
                                    </p>
                                    {feedbackError && <p className="error-message" style={{whiteSpace: 'pre-wrap', marginTop: '1rem', alignSelf: 'flex-start'}}>{feedbackError}</p>}
                                </>
                            )}

                            {activeTab === 'turnover' && (
                                <>
                                    <div {...getTurnoverRootProps()} className={`dropzone ${isTurnoverDragActive ? 'active' : ''}`}>
                                        <input {...getTurnoverInputProps()} />
                                        {!turnoverFile ? (
                                            <div className="dropzone-idle">
                                                <span className="material-symbols-outlined dropzone-icon">trending_down</span>
                                                <p className="page-subtitle" style={{marginBottom: '0'}}>Dosyayı sürükleyin veya</p>
                                                <button type="button" onClick={openTurnoverDialog} className="btn btn-secondary">Dosya Seç</button>
                                            </div>
                                        ) : (
                                            <div className="file-preview-active">
                                                <div className="file-info">
                                                    <span className="material-symbols-outlined file-icon">description</span>
                                                    <div>
                                                        <span className="file-name">{turnoverFile.name}</span>
                                                        <span className="file-size"> ({(turnoverFile.size / 1024).toFixed(2)} KB)</span>
                                                    </div>
                                                </div>
                                                <div className="file-actions">
                                                    <button onClick={() => handleUpload(turnoverFile, uploadTurnoverData, setTurnoverError)} className="btn btn-primary" disabled={isProcessing}>
                                                        {isProcessing ? processingMessage : 'Yükle ve Analiz Et'}
                                                    </button>
                                                    <button type="button" onClick={openTurnoverDialog} className="btn btn-secondary" disabled={isProcessing}>
                                                        Değiştir
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="dropzone-instructions">
                                        Gerekli sütunlar: <strong>Mağazalar</strong> ve ay isimleri (örn: <strong>Ocak, Şubat</strong>).
                                    </p>
                                    {turnoverError && <p className="error-message" style={{whiteSpace: 'pre-wrap', marginTop: '1rem', alignSelf: 'flex-start'}}>{turnoverError}</p>}
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <span className="material-symbols-outlined placeholder-icon">lock</span>
                        <p className="placeholder-text" style={{ maxWidth: '45ch', margin: '0 auto', fontSize: '1rem' }}>
                            Bu sayfada veri yükleme yetkiniz bulunmamaktadır. Yalnızca daha önce yüklenmiş dosyaların geçmişini görüntüleyebilirsiniz.
                        </p>
                    </div>
                )}

                <div className="section">
                    <h3 className="section-title" style={{ marginBottom: '1rem' }}>Son Yüklenen Geri Bildirim Dosyaları</h3>
                    {feedbackFileHistory.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{width: hasUploadPermission ? '50%' : '55%'}}>Dosya Adı</th>
                                        <th style={{width: '30%'}}>Yükleme Tarihi</th>
                                        <th style={{width: '15%', textAlign: 'right'}}>Boyut</th>
                                        {hasUploadPermission && <th style={{width: '5%'}}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {feedbackFileHistory.map((file) => (
                                        <tr key={file.id}>
                                            <td style={{fontWeight: 500}}>{file.name}</td>
                                            <td className="light-text">{new Date(file.uploadDate).toLocaleString('tr-TR')}</td>
                                            <td className="light-text" style={{textAlign: 'right'}}>{(file.size / 1024).toFixed(2)} KB</td>
                                            {hasUploadPermission && (
                                                <td className="action-cell">
                                                    <button 
                                                        onClick={() => deleteFeedbackFile(file.id)} 
                                                        className="btn-icon-danger" 
                                                        title="Dosyayı Sil"
                                                        disabled={isProcessing}
                                                    >
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="card" style={{textAlign: 'center', padding: '2rem'}}>
                             <p className="history-empty-text">Henüz geri bildirim dosyası yüklenmedi.</p>
                        </div>
                    )}
                </div>
                 <div className="section">
                    <h3 className="section-title" style={{ marginBottom: '1rem' }}>Son Yüklenen Turnover Dosyaları</h3>
                    {turnoverFileHistory.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{width: hasUploadPermission ? '50%' : '55%'}}>Dosya Adı</th>
                                        <th style={{width: '30%'}}>Yükleme Tarihi</th>
                                        <th style={{width: '15%', textAlign: 'right'}}>Boyut</th>
                                        {hasUploadPermission && <th style={{width: '5%'}}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {turnoverFileHistory.map((file) => (
                                        <tr key={file.id}>
                                            <td style={{fontWeight: 500}}>{file.name}</td>
                                            <td className="light-text">{new Date(file.uploadDate).toLocaleString('tr-TR')}</td>
                                            <td className="light-text" style={{textAlign: 'right'}}>{(file.size / 1024).toFixed(2)} KB</td>
                                            {hasUploadPermission && (
                                                <td className="action-cell">
                                                     <button 
                                                        onClick={() => deleteTurnoverFile(file.id)} 
                                                        className="btn-icon-danger" 
                                                        title="Dosyayı Sil"
                                                        disabled={isProcessing}
                                                     >
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="card" style={{textAlign: 'center', padding: '2rem'}}>
                             <p className="history-empty-text">Henüz turnover dosyası yüklenmedi.</p>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default UploadPage;