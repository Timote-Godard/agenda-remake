import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SetupWizard from './SetupWizard';
import ressources from '../assets/ressources.json';

// 🎨 1. PALETTE DE COULEURS NÉOBRUTALISTES
const NEO_COLORS = [
    'bg-pink-300', 'bg-cyan-300', 'bg-green-400', 'bg-purple-300',
    'bg-orange-300', 'bg-blue-300', 'bg-rose-300', 'bg-lime-300', 'bg-yellow-300'
];

// 🛠️ 2. DICTIONNAIRE DE CUSTOMISATION DES COURS
const COURSE_RULES = [
    {
        keywords: ['ts', 'typescript'],
        bgImage: 'url("https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg")',
        color: 'bg-blue-400'
    },
    {
        keywords: ['react', 'web'],
        bgImage: 'url("https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg")',
        color: 'bg-cyan-300'
    },
    {
        keywords: ['sport', 'eps', 'siuaps'],
        bgImage: 'url("https://cdn-icons-png.flaticon.com/512/553/553823.png")', 
        color: 'bg-green-400'
    },
    {
        keywords: ['math', 'analyse', 'algèbre'],
        bgImage: 'url("https://cdn-icons-png.flaticon.com/512/1046/1046229.png")', 
        color: 'bg-red-300'
    }
];

// 🧠 3. LE DISTRIBUTEUR DE STYLES
const getCourseTheme = (title) => {
    if (!title) return { colorClass: 'bg-white', bgImage: null };
    
    const lowerTitle = title.toLowerCase();

    for (let rule of COURSE_RULES) {
        if (rule.keywords.some(kw => lowerTitle.includes(kw))) {
            return { colorClass: rule.color, bgImage: rule.bgImage };
        }
    }

    const coreTitle = title.split(' ')[0].toLowerCase(); 
    let hash = 0;
    for (let i = 0; i < coreTitle.length; i++) {
        hash = coreTitle.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % NEO_COLORS.length;
    return { colorClass: NEO_COLORS[index], bgImage: null };
};

// 🧠 Algorithme de calcul des chevauchements de cours
const layoutEvents = (events) => {
    if (!events || events.length === 0) return [];
    
    const sorted = [...events].sort((a, b) => new Date(a.debut) - new Date(b.debut));
    
    let lastEventEnding = null;
    const groups = [];
    let currentGroup = [];

    sorted.forEach(ev => {
        const start = new Date(ev.debut);
        const end = new Date(ev.fin);

        if (lastEventEnding !== null && start >= lastEventEnding) {
            groups.push(currentGroup);
            currentGroup = [];
            lastEventEnding = null;
        }

        currentGroup.push(ev);
        if (lastEventEnding === null || end > lastEventEnding) {
            lastEventEnding = end;
        }
    });
    if (currentGroup.length > 0) groups.push(currentGroup);

    groups.forEach(group => {
        let columns = [];
        group.forEach(ev => {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const lastEvent = columns[i][columns[i].length - 1];
                if (new Date(lastEvent.fin) <= new Date(ev.debut)) {
                    columns[i].push(ev);
                    ev.column = i;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                ev.column = columns.length;
                columns.push([ev]);
            }
        });

        const numColumns = columns.length;
        group.forEach(ev => {
            ev.numColumns = numColumns;
        });
    });

    return sorted;
};

const EntDashboard = ({ agenda, fetchMergedAgenda, modeSallesDispo }) => {
    const [selectedResources, setSelectedResources] = useState(() => {
        const saved = localStorage.getItem('ent_selected_resources');
        return saved ? JSON.parse(saved) : [];
    });

    const [showWizard, setShowWizard] = useState(selectedResources.length === 0);
    const [loading, setLoading] = useState(false);
    const [now, setNow] = useState(new Date());
    const [direction, setDirection] = useState(0);

    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const [hourSize, setHourSize] = useState(windowSize.height/30);

    useEffect(() => {
        const handleResize = () => {
        setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight,
        });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setHourSize(windowSize.height/19);
    }, [windowSize])

    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0,0,0,0);
        return monday;
    });

    const handleSetupComplete = (newSelections) => {
        setSelectedResources(newSelections);
        setShowWizard(false);
    };

    const [currentDayIndex, setCurrentDayIndex] = useState(() => {
        const today = new Date().getDay();
        return (today >= 1 && today <= 5) ? today - 1 : 0;
    });

    const START_HOUR = 8;
    const END_HOUR = 21;
    const touchStartX = useRef(null);

    const goToNext = () => {
        setDirection(1);
        if (window.innerWidth < 768) {
            if (currentDayIndex === 4) {
                const nextMonday = new Date(currentWeekStart);
                nextMonday.setDate(nextMonday.getDate() + 7);
                setCurrentWeekStart(nextMonday);
                setCurrentDayIndex(0);
            } else {
                setCurrentDayIndex(prev => prev + 1);
            }
        } else {
            const next = new Date(currentWeekStart);
            next.setDate(next.getDate() + 7);
            setCurrentWeekStart(next);
        }
    };

    const goToPrev = () => {
        setDirection(-1);
        if (window.innerWidth < 768) {
            if (currentDayIndex === 0) {
                const prevMonday = new Date(currentWeekStart);
                prevMonday.setDate(prevMonday.getDate() - 7);
                setCurrentWeekStart(prevMonday);
                setCurrentDayIndex(4);
            } else {
                setCurrentDayIndex(prev => prev - 1);
            }
        } else {
            const prev = new Date(currentWeekStart);
            prev.setDate(prev.getDate() - 7);
            setCurrentWeekStart(prev);
        }
    };

    const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const handleTouchEnd = (e) => {
        if (!touchStartX.current) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) goToNext();
            else goToPrev();
        }
        touchStartX.current = null;
    };

    const daysOfWeek = useMemo(() => {
        return Array.from({ length: 5 }, (_, i) => {
            const d = new Date(currentWeekStart);
            d.setDate(d.getDate() + i);
            return {
                label: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'][i],
                date: d,
                iso: d.toLocaleDateString('en-CA')
            };
        });
    }, [currentWeekStart]);

    const calculateStyles = (course) => {
        const start = new Date(course.debut);
        const end = new Date(course.fin);
        if (isNaN(start) || isNaN(end)) return { display: 'none' };

        const startMinutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

        const top = (startMinutes / 60) * hourSize;
        const height = (durationMinutes / 60) * hourSize;

        const numCols = course.numColumns || 1;
        const colIdx = course.column || 0;

        return {
            top: `${top}px`,
            height: `${height}px`,
            left: `calc(${(colIdx / numCols) * 100}% + 4px)`,
            width: `calc(${100 / numCols}% - 12px)`, 
        };
    };

    const currentTimeTop = useMemo(() => {
        const h = now.getHours();
        const m = now.getMinutes();
        if (h < START_HOUR || h >= END_HOUR) return null;
        return ((h - START_HOUR) * 60 + m) / 60 * hourSize;
    }, [now]);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        fetchMergedAgenda(selectedResources);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        localStorage.setItem('ent_selected_resources', JSON.stringify(selectedResources));
        if (selectedResources.length > 0) fetchMergedAgenda(selectedResources);
    }, [selectedResources]);

    const slideVariants = {
        enter: (direction) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
        center: { zIndex: 1, x: 0, opacity: 1 },
        exit: (direction) => ({ zIndex: 0, x: direction < 0 ? '100%' : '-100%', opacity: 0 })
    };

    const animationKey = window.innerWidth < 768 ? currentDayIndex : currentWeekStart.toISOString();

    if (showWizard) {
        return (
            <SetupWizard 
                data={ressources}
                initialSelections={selectedResources}
                onComplete={handleSetupComplete}
                onClose={() => {
                    if (selectedResources.length > 0) setShowWizard(false);
                }}
            />
        );
    }

    return (
        <div className="p-4 min-h-screen bg-yellow-200 text-black">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-end border-b-8 border-black pb-4 mb-6">
                        <h1 className="text-5xl font-black uppercase italic">Agenda</h1>
                        <button onClick={() => setShowWizard(true)} className="relative right-0 top-0 border-2 border-black p-2 bg-white hover:bg-black hover:translate-y-[-2px] hover:translate-x-[-2px] cursor-pointer hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 hover:text-white cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all">
                            <Settings size={18} />
                        </button>
                        <button onClick={() => modeSallesDispo()} className="relative right-0 top-0 border-2 border-black p-2 bg-white hover:bg-black hover:translate-y-[-2px] hover:translate-x-[-2px] cursor-pointer hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 hover:text-white cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all">
                            <MapPin size={18} />
                        </button>
                    </header>
                
                <div className="flex flex-col md:flex-row justify-between font-mono items-center gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={goToPrev} className="bg-white border-3 border-black p-1 hover:translate-y-[-2px] hover:text-white hover:translate-x-[-2px] cursor-pointer hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"><ChevronLeft size={24} /></button>
                        
                        <div className="text-center min-w-[200px]">
                            <span className="font-black uppercase block text-sm opacity-60">
                                {window.innerWidth < 768 ? "Planning du jour" : "Aperçu Semaine"}
                            </span>
                            <span className="font-black text-3xl sm:text-xl italic uppercase">
                                {window.innerWidth < 768 
                                    ? `${daysOfWeek[currentDayIndex].label} ${daysOfWeek[currentDayIndex].date.getDate()} ${daysOfWeek[currentDayIndex].date.toLocaleDateString('fr-FR', {month:'short'})}`
                                    : `${daysOfWeek[0].date.toLocaleDateString('fr-FR', {day:'numeric', month:'short'})} - ${daysOfWeek[4].date.toLocaleDateString('fr-FR', {day:'numeric', month:'short'})}`
                                }
                            </span>
                        </div>

                        <button onClick={goToNext} className="bg-white border-3 border-black p-1 hover:translate-y-[-2px] hover:text-white hover:translate-x-[-2px] cursor-pointer hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"><ChevronRight size={24} /></button>
                    </div>
                </div>

                <div 
                    className="relative flex overflow-hidden font-mono"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    style={{ minHeight: (END_HOUR - START_HOUR) * hourSize }} 
                >
                    <div className="w-12 pt-3 mr-2 sm:w-20 border-r-2 border-black flex-shrink-0 z-20">
                        {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                            <div key={i} style={{ height: hourSize }} className="relative border-b border-black/5">
                                <span className="absolute -top-3 left-0 w-full text-center text-[10px] font-black">{(START_HOUR + i)}H</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 relative overflow-hidden">
                        <AnimatePresence initial={false} custom={direction}>
                            <motion.div
                                key={animationKey}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }} 
                                className="absolute inset-0 flex"
                            >
                                {daysOfWeek.map((day, dIdx) => {
                                    const isVisible = window.innerWidth >= 768 || currentDayIndex === dIdx;
                                    if (!isVisible) return null;

                                    const dayEvents = agenda.filter(e => {
                                        const d = new Date(e.debut);
                                        return d.toLocaleDateString('en-CA') === day.iso;
                                    });
                                    
                                    const laidOutEvents = layoutEvents(dayEvents);
                                    const isToday = new Date().toLocaleDateString('en-CA') === day.iso;

                                    return (
                                        <div key={day.iso} className="flex-1 mt-2 border-r-2 border-black/10 relative">
                                            
                                            {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                                                <div key={i} style={{ height: hourSize, top: i * hourSize }} className="absolute border-b border-black/5 w-full"></div>
                                            ))}

                                            {isToday && currentTimeTop !== null && (
                                                <div 
                                                    style={{ top: `${currentTimeTop}px` }} 
                                                    className="absolute left-0 w-full h-[2px] bg-red-600 z-30 pointer-events-none flex items-center"
                                                >
                                                    <div className="w-3 h-3 bg-red-600 rounded-full -ml-1.5 border-2 border-black"></div>
                                                </div>
                                            )}

                                            {loading ? "" : 
    laidOutEvents.map((course, cIdx) => {
        const theme = getCourseTheme(course.titre);

        return (
            <div key={cIdx} 
                style={calculateStyles(course)}
className={`absolute border-2 border-black p-1 sm:p-2 overflow-hidden hover:z-40 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition duration-200 cursor-pointer ${theme.colorClass}`}
            >
                {theme.bgImage && (
                    <div 
                        className="absolute bottom-[-10px] right-[-10px] w-16 h-16 opacity-30 -rotate-12 bg-no-repeat bg-contain bg-center pointer-events-none"
                        style={{ backgroundImage: theme.bgImage }}
                    />
                )}

                <div className="relative z-10 flex flex-col h-full pointer-events-none">
                    <div className="bg-black text-white text-[8px] px-1 font-bold w-fit mb-1">
                        {new Date(course.debut).getHours()}H{String(new Date(course.debut).getMinutes()).padStart(2, '0')}
                    </div>
                    
                    <h4 className="font-black text-sm sm:text-[10px] leading-tight uppercase  break-words">
                        {course.titre}
                    </h4>


                    <div className="mt-auto flex flex-wrap gap-1">
                        {course.salle.split(",").map((salle, index) => (
                            <div 
                                key={index}
                                className="flex items-center gap-1 text-[10px] sm:text-[12px] font-bold opacity-90 truncate bg-white border border-black px-1 w-fit shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            >
                                <MapPin size={8} strokeWidth={3} /> 
                                {salle.trim()}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    })
}
                                        </div>
                                    );
                                })}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EntDashboard;