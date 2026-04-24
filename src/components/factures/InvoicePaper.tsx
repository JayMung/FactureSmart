"use client";

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Facture } from '@/types';

interface InvoicePaperProps {
  facture: Facture;
  dgiRegistry?: {
    numero_dgi?: string;
    code_auth?: string;
    qr_code_data?: string;
    content_hash?: string;
  } | null;
  declarant?: {
    raison_sociale: string;
    nif?: string;
    rccm?: string;
    adresse?: string;
  };
  className?: string;
}

const fmt = (n: number, dec = 2) =>
  new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n);

const fmtCurrency = (amount: number, currency = 'USD') =>
  currency === 'USD' ? `$${fmt(amount)}` : `${fmt(amount)} FC`;

const InvoicePaper: React.FC<InvoicePaperProps> = ({
  facture,
  dgiRegistry,
  declarant,
  className = '',
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const client = facture.client || facture.clients;

  // Company info — use declarant if provided, else fallback
  const company = declarant || {
    raison_sociale: 'SARL Votre Entreprise',
    nif: '0XXXXXXXXX-RDC',
    rccm: 'RCCM/KIN/2024/00000',
    adresse: 'Avenue du Commerce, Quartier Commercial\nKinshasa, République Démocratique du Congo',
  };

  // Generate QR code from qr_code_data
  useEffect(() => {
    const data = dgiRegistry?.qr_code_data || facture.qr_code_data ||
      `${company.raison_sociale}|${company.nif}|${facture.facture_number}|${(facture.montant_ttc || facture.total_general)?.toFixed(2)}|${facture.date_emission?.split('T')[0]}|${(facture.items?.length || 0)} articles`;

    QRCode.toDataURL(data, {
      width: 96,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('QR code error:', err));
  }, [dgiRegistry, facture, company]);

  const items = facture.items || [];
  const tauxTva = facture.montant_tva && facture.montant_ht
    ? (facture.montant_tva / facture.montant_ht)
    : 0.16; // default 16%
  const totalHt = facture.montant_ht || facture.subtotal || 0;
  const totalTva = facture.montant_tva || totalHt * tauxTva;
  const totalTtc = facture.montant_ttc || facture.total_general || totalHt + totalTva;

  const dateEmission = facture.date_emission
    ? new Date(facture.date_emission).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  const dateValidation = dgiRegistry
    ? new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }) + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' UTC+2'
    : null;

  const codeAuth = dgiRegistry?.code_auth
    ? `${facture.facture_number}-${dgiRegistry.code_auth}`
    : `${facture.facture_number}-AUTH`;

  const shortHash = dgiRegistry?.content_hash
    ? `sha256:${dgiRegistry.content_hash.slice(0, 16)}...`
    : `sha256:${facture.facture_number}-${Date.now().toString(16).slice(0, 16)}...`;

  const isDgiValid = dgiRegistry && (facture.statut === 'validee' || facture.statut === 'payee');

  return (
    <div
      className={`bg-white rounded-2xl mx-auto overflow-hidden ${className}`}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm',
        boxSizing: 'border-box',
        fontSize: '11pt',
        position: 'relative',
        boxShadow: '0 4px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05)',
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div
        className="flex items-start justify-between mb-6 pb-5"
        style={{ borderBottom: '2px solid #16a34a' }}
      >
        {/* Company info */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#16a34a' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">
              Facture Smart
            </span>
          </div>
          <div className="text-xs text-gray-500 space-y-0.5 mt-3">
            <p className="font-semibold text-gray-700">{company.raison_sociale}</p>
            {(company.adresse || '').split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            <p>NIF : {company.nif}</p>
            <p>RCCM : {company.rccm}</p>
          </div>
        </div>

        {/* FACTURE title + info box */}
        <div className="text-right">
          <h2 className="text-3xl font-extrabold mb-2" style={{ color: '#16a34a' }}>
            FACTURE
          </h2>
          <div
            className="border rounded-xl p-3 inline-block text-left"
            style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              N° Facture
            </p>
            <p className="text-sm font-bold font-mono" style={{ color: '#16a34a' }}>
              {facture.facture_number}
            </p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2 mb-1">
              Date d'émission
            </p>
            <p className="text-sm font-medium text-gray-700">{dateEmission}</p>
          </div>
        </div>
      </div>

      {/* ── CLIENT INFO ────────────────────────────────────────── */}
      <div className="mb-5 p-4 rounded-xl border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Client
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-gray-900">
              {client?.nom || 'Client'}
            </p>
            {client?.nif && <p className="text-xs text-gray-500">NIF : {client.nif}</p>}
            {client?.adresse && <p className="text-xs text-gray-500">{client.adresse}</p>}
            {client?.ville && <p className="text-xs text-gray-500">{client.ville}, RDC</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Statut DGI
            </p>
            {isDgiValid ? (
              <span
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full"
                style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                Validée — Code reçu
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full"
                style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#eab308' }} />
                En attente
              </span>
            )}
            {dateValidation && (
              <p className="text-xs text-gray-400 mt-1">{dateValidation}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── ITEMS TABLE ───────────────────────────────────────── */}
      <div className="mb-5">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: '#16a34a', color: 'white' }}>
              <th className="px-3 py-2.5 text-left font-semibold rounded-tl-lg">Désignation</th>
              <th className="px-3 py-2.5 text-center font-semibold">Qté</th>
              <th className="px-3 py-2.5 text-right font-semibold">Prix unitaire HT</th>
              <th className="px-3 py-2.5 text-right font-semibold rounded-tr-lg">Montant HT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                  Aucun article
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                >
                  <td className="px-3 py-2.5 text-gray-800">{item.description}</td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{item.quantite}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700 font-mono">
                    {fmtCurrency(item.prix_unitaire, facture.devise)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold font-mono text-gray-900">
                    {fmtCurrency(item.montant_total, facture.devise)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── TOTALS ─────────────────────────────────────────────── */}
      <div className="flex justify-end mb-6">
        <div style={{ width: '160px' }}>
          <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <span className="text-xs text-gray-600">Total HT</span>
            <span className="text-xs font-semibold font-mono text-gray-900">
              {facture.devise === 'USD' ? 'USD' : 'CDF'} {fmt(totalHt)}
            </span>
          </div>
          <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <span className="text-xs text-gray-600">TVA ({(tauxTva * 100).toFixed(0)}%)</span>
            <span className="text-xs font-semibold font-mono text-gray-900">
              {facture.devise === 'USD' ? 'USD' : 'CDF'} {fmt(totalTva)}
            </span>
          </div>
          <div
            className="flex justify-between py-3 px-4 rounded-lg mt-1"
            style={{ backgroundColor: '#16a34a' }}
          >
            <span className="text-sm font-bold text-white">Total TTC</span>
            <span className="text-sm font-bold text-white font-mono">
              {facture.devise === 'USD' ? 'USD' : 'CDF'} {fmt(totalTtc)}
            </span>
          </div>
        </div>
      </div>

      {/* ── QR CODE + AUTH INFO ────────────────────────────────── */}
      <div
        className="flex items-end justify-between pt-5"
        style={{ borderTop: '2px solid #e2e8f0' }}
      >
        {/* QR Code */}
        <div className="text-xs text-gray-500">
          <p className="font-semibold text-gray-700 mb-2">QR Code — Facture Smart DGI</p>
          <div
            className="w-24 h-24 rounded-xl flex items-center justify-center p-1.5"
            style={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }}
          >
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR Code DGI" className="w-full h-full" />
            ) : (
              <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                <span className="text-[8px] text-gray-400">Loading...</span>
              </div>
            )}
          </div>
          <p className="mt-1 text-[10px] text-gray-400">Scanner pour vérifier l'authenticité</p>
        </div>

        {/* Auth info */}
        <div className="text-right space-y-2">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
              Code d'authentification DGI
            </p>
            <p
              className="text-sm font-bold font-mono border rounded-lg px-3 py-1 inline-block mt-0.5"
              style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}
            >
              {codeAuth}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
              Signature numérique
            </p>
            <p
              className="text-xs font-mono text-gray-600 rounded px-2 py-1 inline-block mt-0.5"
              style={{ backgroundColor: '#f1f5f9' }}
            >
              {shortHash}
            </p>
          </div>
          {dgiRegistry?.numero_dgi && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                N° DGI
              </p>
              <p className="text-xs text-gray-700">{dgiRegistry.numero_dgi}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
              Transmise le
            </p>
            <p className="text-xs text-gray-700">{dateValidation || '—'}</p>
          </div>
        </div>
      </div>

      {/* ── DRC STAMP (watermark) ──────────────────────────────── */}
      <div
        className="absolute bottom-12 left-20 pointer-events-none"
        style={{ opacity: 0.04 }}
      >
        <svg width="160" height="106" viewBox="0 0 160 106" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="53" height="35" fill="#10B981"/>
          <rect y="35" width="53" height="36" fill="#FFD100"/>
          <rect y="71" width="53" height="35" fill="#10B981"/>
          <rect x="53" width="54" height="106" fill="#10B981"/>
          <circle cx="80" cy="53" r="16" fill="none" stroke="#10B981" strokeWidth="2.5"/>
          <circle cx="80" cy="53" r="8" fill="#FFD100"/>
        </svg>
      </div>
    </div>
  );
};

export default InvoicePaper;
