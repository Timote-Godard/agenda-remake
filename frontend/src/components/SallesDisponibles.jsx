import React, { useState, useEffect } from 'react';
import ICAL from 'ical.js';

const SallesDisponibles = ({retourEDT}) => {
  const [sallesStatus, setSallesStatus] = useState([]);
  const [chargement, setChargement] = useState(false);

  const listeSallesRaw = [
  { nom: "B41-001", id: "5571" },
  { nom: "B41-002", id: "5572" },
  { nom: "B41-003", id: "5573" },
  { nom: "B41-004", id: "5574" },
  { nom: "B41-101", id: "5577" },
  { nom: "B41-102", id: "5578" },
  { nom: "B41-103", id: "5579" },
  { nom: "B41-104", id: "5580" },
  { nom: "B42-Amphi N", id: "148" },
  { nom: "B42-Amphi M", id: "147" },
  { nom: "B42-Amphi L", id: "146" }
];

  useEffect(() => {
    const analyserSalles = async () => {
      setChargement(true);
      const maintenant = new Date();
      const finDeJournee = new Date(maintenant);
      finDeJournee.setHours(19, 30, 0, 0); // La fac ferme généralement vers cette heure

      const resultats = await Promise.allSettled(
        listeSallesRaw.map(async (salle) => {
            try {
            // On construit l'URL avec l'ID numérique direct
            const icalUrl = `/univ-api/jsp/custom/modules/plannings/anonymous_cal.jsp?resources=${salle.id}&projectId=1&calType=ical&nbWeeks=1`;

            const response = await fetch(icalUrl);
            
            // LOG DE DEBUG : Si ça échoue encore, regarde ce que dit la console ici
            if (!response.ok) {
                console.error(`Erreur HTTP pour ${salle.nom}: ${response.status}`);
                throw new Error("Erreur réseau");
            }

            const text = await response.text();
            
            if (!text || !text.includes("BEGIN:VCALENDAR")) {
                console.warn(`Contenu reçu pour ${salle.nom} invalide:`, text.substring(0, 100));
                throw new Error("Format invalide");
            }

            const jcalData = ICAL.parse(text);
            const vcalendar = new ICAL.Component(jcalData);
            const vevents = vcalendar.getAllSubcomponents('vevent');

            const coursAujourdhui = vevents.map(v => {
            const e = new ICAL.Event(v);
            return { start: e.startDate.toJSDate(), end: e.endDate.toJSDate() };
            })
            // On garde ceux qui se terminent après maintenant
            .filter(e => e.start.toDateString() === maintenant.toDateString() && e.end > maintenant)
            // On trie par ordre chronologique
            .sort((a, b) => a.start - b.start);

            let message = "";
            let css = "";

            // 1. Est-ce qu'il y a un cours EN CE MOMENT ?
            const coursEnCours = coursAujourdhui.find(c => c.start <= maintenant && c.end > maintenant);

            if (coursEnCours) {
            // --- LA SALLE EST OCCUPÉE ---
            let dispoA = coursEnCours.end;
            
            // On vérifie si d'autres cours s'enchaînent directement après
            for (const cours of coursAujourdhui) {
                if (cours.start <= dispoA && cours.end > dispoA) {
                dispoA = cours.end;
                }
            }

            if (dispoA >= finDeJournee) {
                message = "Pas dispo aujourd'hui";
                css = "bg-red-50 border-red-200 text-red-700";
            } else {
                const h = dispoA.getHours();
                const m = dispoA.getMinutes().toString().padStart(2, '0');
                message = `Occupée, dispo à ${h}h${m}`;
                css = "bg-orange-50 border-orange-200 text-orange-700";
            }

            } else {
            // --- LA SALLE EST LIBRE MAINTENANT ---
            // On cherche le tout prochain cours qui n'a pas encore commencé
            const prochainCours = coursAujourdhui.find(c => c.start > maintenant);

            if (prochainCours) {
                const h = prochainCours.start.getHours();
                const m = prochainCours.start.getMinutes().toString().padStart(2, '0');
                message = `Disponible jusqu'à ${h}h${m}`;
                css = "bg-green-50 border-green-200 text-green-700";
            } else {
                const h = finDeJournee.getHours();
                const m = finDeJournee.getMinutes().toString().padStart(2, '0');
                message = `Disponible jusqu'à ${h}h${m}`; // Ou "Disponible tout le reste de la journée"
                css = "bg-green-50 border-green-200 text-green-700";
            }
            }

            return { nom: salle.nom, message, css };

          } catch (e) {
            console.log(e);
            return { nom: salle.nom, message: "Erreur flux", css: "bg-gray-50 text-gray-400" };
          }
        })
      );

      setSallesStatus(resultats.map(r => r.value));
      setChargement(false);
    };

    analyserSalles();
  }, []);

  return (
    <div className="p-4">
        <button onClick={() => retourEDT()} className="relative right-0 top-0 border-2 border-black p-2 bg-white hover:bg-black hover:translate-y-[-2px] hover:translate-x-[-2px] cursor-pointer hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 hover:text-white cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all">
            Salut
        </button>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Salles de cours (B41/B42)</h2>
        <button onClick={() => window.location.reload()} className="text-sm bg-gray-100 px-3 py-1 rounded">Actualiser</button>
      </div>

      {chargement ? (
        <div className="text-center py-10 text-gray-500">Scan des salles en cours...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sallesStatus.map((salle, i) => (
            <div key={i} className={`p-4 rounded-xl border-2 ${salle.css} flex justify-between items-center`}>
              <span className="font-bold">{salle.nom}</span>
              <span className="text-sm font-medium">{salle.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SallesDisponibles;