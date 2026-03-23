import React, { useState } from 'react';
import EntDashboard from './components/EntDashboard';
import ICAL from 'ical.js';

const App = () => {
  const [agenda, setAgenda] = useState([]);
  const [affichageEntier, setAffichageEntier] = useState(false);

  const fetchMergedAgenda = async (selectedResources) => {
    try {
      const ids = selectedResources.map(r => r.id).join(',');

      const cacheKey = `agenda_cache_${ids}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        setAgenda(JSON.parse(cachedData)); // Bam, affichage instantané !
      }


      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      
      // On la formate en YYYY-MM-DD (ex: "2023-09-15")
      const firstDateString = pastDate.toISOString().split('T')[0];
      
      // On utilise le proxy en dev (/univ-api) et l'URL complète sur mobile
      const baseUrl = window.location.hostname === 'localhost' 
        ? '/univ-api/jsp/custom/modules/plannings/anonymous_cal.jsp'
        : 'https://planning.univ-rennes1.fr/jsp/custom/modules/plannings/anonymous_cal.jsp';
      
      const fullUrl = `${baseUrl}?resources=${ids}&projectId=1&calType=ical&firstDate=${firstDateString}&nbWeeks=12`;

      // On utilise directement fetch
      const response = await fetch(fullUrl);
      const text = await response.text();

      if (!text || !text.includes("BEGIN:VCALENDAR")) {
        console.warn("Réponse vide ou invalide de l'agenda");
        return;
      }
      
      const jcalData = ICAL.parse(text);
      const vcalendar = new ICAL.Component(jcalData);
      const vevents = vcalendar.getAllSubcomponents('vevent');

      const uniqueEvents = new Map();

      vevents.forEach(vevent => {
        const event = new ICAL.Event(vevent);
        const titre = event.summary;
        const debut = event.startDate.toJSDate();
        const fin = event.endDate.toJSDate();
        const salle = event.location || "Non précisée";
        const description = event.description || "";
        const prof = description ? description.split('\n')[0] : "Inconnu";

        const key = `${titre}-${debut.toISOString()}-${fin.toISOString()}`;
        if (!uniqueEvents.has(key)) {
          uniqueEvents.set(key, {
            titre,
            debut,
            fin,
            salle,
            prof
          });
        }
      });

      const sortedAgenda = Array.from(uniqueEvents.values())
        .sort((a, b) => new Date(a.debut) - new Date(b.debut));

      localStorage.setItem(cacheKey, JSON.stringify(sortedAgenda));

      setAgenda(sortedAgenda);
    } catch (err) { 
      console.error("Erreur lors de la récupération de l'agenda:", err); 
    } 
  };

  return (
    <div className="app-container bg-white min-h-screen">
      <EntDashboard 
        agenda={agenda} 
        setAgenda={setAgenda} 
        fetchMergedAgenda={fetchMergedAgenda} 
        onBack={() => {}} 
      />
    </div>
  );
};

export default App;