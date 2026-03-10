# 📋 App Ordini "San Luigi"

Applicazione web per la gestione ordini del bar **San Luigi**, ottimizzata per utilizzo interno su PC/tablet con stampante termica da 80mm.

---

## ✨ Funzionalità principali

### 🏠 Home
- Pulsanti prodotti divisi per categorie (colori personalizzati).
- Carrello con totale e possibilità di rimuovere articoli singoli.
- Gestione **stock in tempo reale** con aggiornamento automatico ogni 10 secondi su più dispositivi.
- Pulsante **"Stampa e invia"**: stampa scontrino ottimizzato 80mm, numerato e con dicitura *"NON FISCALE"*.
- Pulsante **"Svuota carrello"** con conferma e reintegro automatico dello stock.

### ⚙️ Impostazioni
- Creazione/modifica/eliminazione **categorie** (nome, colore, ordine).
- Creazione/modifica/eliminazione **prodotti** (nome, prezzo, stock, attivo/disattivo).
- Prodotti attivabili/disattivabili senza doverli eliminare.
- **Cambio PIN** protetto: richiede il PIN attuale prima di impostarne uno nuovo.

### 📊 Storico ordini
- Selezione **range di date** (Da → A) invece della singola data.
- **Preset rapidi**: Oggi, Ieri, Ultimi 7 giorni, Questo mese, Tutto.
- **Riepilogo periodo** con tre card: Incasso totale, Numero ordini, Prodotto più venduto.
- Tabella con prodotto, quantità venduta e **ricavo per prodotto**.
- Prodotti ordinati per quantità venduta decrescente.
- Esportazione in **CSV**, **PDF** e **Excel** con nome file che include il range di date.

### 🔐 Accesso
- Login tramite **PIN numerico** — semplice e affidabile su tutti i browser.
- Sessione attiva finché non si chiude il browser o si fa logout.
- PIN modificabile direttamente dalle Impostazioni (protetto dal PIN attuale).
- PIN di default: `1234` — da cambiare al primo accesso.

---

## ⚙️ Tecnologia

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Netlify Functions (serverless, Node.js)
- **Database**: [Neon](https://neon.tech/) — Postgres serverless tramite Netlify DB
- **Hosting**: [Netlify](https://netlify.com)
- **Stampa**: finestra dedicata ottimizzata per stampanti termiche 80mm

---

## 🚀 Setup iniziale

1. Clona o forka il repository su GitHub
2. Collega il repo a Netlify (Add new site → Import from GitHub)
3. Abilita **Netlify DB** dal pannello Netlify (genera automaticamente `NETLIFY_DATABASE_URL`)
4. Dopo il primo deploy, inizializza le tabelle aprendo la console del browser e lanciando:
   ```javascript
   fetch('/api/init-db', {method:'POST'}).then(r=>r.json()).then(console.log)
   ```
5. Risposta attesa: `{ ok: true, message: "Tabelle create con successo" }`
6. Accedi con il PIN di default `1234` e cambialo subito da Impostazioni

---

## 🖨️ Stampa Scontrini

- Stampante termica **80mm** consigliata.
- Browser consigliato: **Chrome** su PC/tablet.
- Contenuto scontrino: logo, nome bar, numero ordine progressivo, data/ora, lista prodotti, totale, dicitura **"NON FISCALE"**.

---

## 🔐 Note di sicurezza

- L'app è pensata per **uso interno** durante eventi.
- Il PIN protegge l'accesso — cambiarlo rispetto al default prima dell'evento.
- Il PIN viene salvato in `sessionStorage` (si azzera chiudendo il browser).
- Le credenziali del database sono gestite come variabili d'ambiente su Netlify — non visibili nel codice sorgente.

---

## 📂 Struttura file

```
├── index.html              → struttura pagine (Home, Impostazioni, Storico)
├── style.css               → grafica, layout responsive, schermata PIN
├── script.js               → logica app, PIN login, API calls, stampa, storico
├── netlify.toml            → configurazione Netlify Functions
├── package.json            → dipendenze Node.js (@netlify/neon)
└── netlify/
    └── functions/
        ├── categories.js   → CRUD categorie
        ├── products.js     → CRUD prodotti + gestione stock atomica
        ├── orders.js       → salvataggio ordini + query storico per range date
        ├── config.js       → nome bar
        └── init-db.js      → inizializzazione tabelle Postgres
```

---

## 👨‍💻 Manutenzione

- Aggiungere nuovi prodotti/categorie da **Impostazioni**.
- Lo **stock** si aggiorna automaticamente quando si vende/rimuove un prodotto.
- Gli **ordini** vengono salvati nel database Neon e sono visibili nello storico.
- Il database Neon va mantenuto attivo collegando l'account su [neon.tech](https://neon.tech).

---

✍️ **Autore:** progetto interno per la gestione del Bar *San Luigi*.
