import React, { useEffect, useState } from 'react';
import { ScreenId, Song, Coach, Player } from './types/game';
import { getAllSongs, deleteCustomTrainedSong, clearAllCustomSongs } from './data/songsData';
import { Header } from './components/Header';
import { RightPartyPanel } from './components/RightPartyPanel';
import { HomeScreen } from './components/HomeScreen';
import { SongsCatalogScreen } from './components/SongsCatalogScreen';
import { CoachSelectScreen } from './components/CoachSelectScreen';
import { GameplayScreen } from './components/GameplayScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { TrainingStudio } from './components/TrainingStudio';
import { PhoneController } from './components/PhoneController';
import { PhonePairingModal } from './components/modals/PhonePairingModal';
import { YoloDiagnosticModal } from './components/modals/YoloDiagnosticModal';
import { ProfileEditorModal } from './components/modals/ProfileEditorModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { StoreModal } from './components/modals/StoreModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { DancerCardModal } from './components/modals/DancerCardModal';
import { MaintenanceModeModal } from './components/modals/MaintenanceModeModal';
import { GenericModal } from './components/modals/GenericModal';
import { socketService } from './services/socketService';
import { menuMusic } from './services/menuMusicService';
import { detectDeviceCamera } from './services/cameraDetection';
import { importCdncePackage } from './services/cdncePackageService';

export default function App() {
  // Check if current view is mobile phone controller
  const queryParams = new URLSearchParams(window.location.search);
  const routeParam = queryParams.get('route');
  const isControllerView =
    queryParams.get('controller') === 'true' ||
    routeParam === 'controller' ||
    window.location.pathname.endsWith('/controller') ||
    window.location.pathname.endsWith('/controller/');

  if (isControllerView) {
    return <PhoneController />;
  }

  // Room PIN code for phone pairing
  const [roomId] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());

  // Songs catalog state (custom trained from IndexedDB/localStorage, default is empty)
  const [songsList, setSongsList] = useState<Song[]>(() => getAllSongs());

  // Screen & Navigation state
  const [activeScreen, setActiveScreen] = useState<ScreenId>('home');
  const [selectedSong, setSelectedSong] = useState<Song | null>(() => songsList[0] || null);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(
    () => songsList[0]?.coaches?.[0] || null
  );

  // Hardware Camera Detection
  const [hasCamera, setHasCamera] = useState<boolean>(true);

  // Modals state
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showTrainingStudio, setShowTrainingStudio] = useState(false);
  const [showYoloDiagnostic, setShowYoloDiagnostic] = useState(false);
  const [showMaintenanceMode, setShowMaintenanceMode] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showDancerCardModal, setShowDancerCardModal] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; body: string } | null>(null);

  // Active Players: STRICTLY DEFAULT TO 1 PLAYER
  const [players, setPlayers] = useState<Player[]>([
    {
      id: 'host-camera-p1',
      name: 'Jazzy (Camera P1)',
      avatarSeed: 'PandaJD',
      color: '#ff1493',
      score: 0,
      stars: 0,
      lastFeedback: 'READY',
      streak: 0,
      maxStreak: 0,
      momentum: 0,
      multiplier: 1,
      rank: 'Bronze',
      isCameraTracked: true,
      assignedCoachIndex: 0,
    },
  ]);

  const [activeDancerForCard, setActiveDancerForCard] = useState<Player>(players[0]);

  // Check hardware camera availability on startup & expose DevTools Maintenance hook
  useEffect(() => {
    (window as any).openMaintenance = () => setShowMaintenanceMode(true);
    (window as any).openDiagnostics = () => setShowMaintenanceMode(true);
    (window as any).closeMaintenance = () => setShowMaintenanceMode(false);
    console.log(
      '%c🛠️ ColeDance DevTools: Run openMaintenance() or openDiagnostics() in this console to launch Maintenance Mode.',
      'color: #00d2ff; font-weight: bold; font-size: 12px;'
    );

    detectDeviceCamera().then((status) => {
      const available = status.hasCamera;
      setHasCamera(available);
      if (!available) {
        setPlayers((prev) =>
          prev.map((p, idx) =>
            idx === 0
              ? {
                  ...p,
                  isCameraTracked: false,
                  isPhoneController: true,
                  name: p.name.replace('(Camera P1)', '(Phone P1)'),
                }
              : p
          )
        );
      }
    });

    return () => {
      delete (window as any).openMaintenance;
      delete (window as any).openDiagnostics;
      delete (window as any).closeMaintenance;
    };
  }, []);

  // Start background menu music on main menu
  useEffect(() => {
    if (activeScreen !== 'gameplay') {
      menuMusic.startMenuMusic();
    }
  }, [activeScreen]);

  // Socket Host Room Setup for Phone Controllers
  useEffect(() => {
    socketService.hostRoom(roomId);
    const socket = socketService.socket;

    if (socket) {
      socket.on('player_joined', (data: { player: any; room: any }) => {
        console.log('[Host] Phone controller connected:', data.player);
        setPlayers((prev) => {
          if (prev.some((p) => p.id === data.player.id)) return prev;
          return [
            ...prev,
            {
              id: data.player.id,
              name: data.player.name,
              avatarSeed: data.player.avatarSeed,
              color: data.player.color,
              score: 0,
              stars: 0,
              lastFeedback: 'READY',
              streak: 0,
              isPhoneController: true,
              assignedCoachIndex: prev.length % 3,
            },
          ];
        });
      });

      socket.on('player_left', (data: { playerId: string }) => {
        setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
      });
    }
  }, [roomId]);

  const handleSongImported = (imported: Song) => {
    const updated = getAllSongs();
    setSongsList(updated);
    setSelectedSong(imported);
    if (imported.coaches && imported.coaches.length > 0) {
      setSelectedCoach(imported.coaches[0]);
    }
    setModalData({
      title: 'Routine Imported!',
      body: `"${imported.title}" by ${imported.artist} is ready to dance! Original high-resolution video and choreography moves have been loaded into your library.`,
    });
  };

  const handleImportCdnceFile = async (file: File) => {
    try {
      const imported = await importCdncePackage(file);
      handleSongImported(imported);
    } catch (err: any) {
      console.error('Failed to import .cdnce:', err);
      setModalData({
        title: 'Import Failed',
        body: err?.message || 'Could not import the selected .cdnce package. Please check that the file is a valid ColeDance routine.',
      });
    }
  };

  const handleSongSelect = (song: Song) => {
    setSelectedSong(song);
    setSelectedCoach(song.coaches?.[0] || null);
    setActiveScreen('coaches');
  };

  const handleStartRoutine = (coach: Coach, playerCoachAssignments?: Record<string, number>) => {
    if (!selectedSong) return;
    setSelectedCoach(coach);

    const updatedPlayers: Player[] = players.map((p) => ({
      ...p,
      score: 0,
      stars: 0,
      lastFeedback: 'READY',
      streak: 0,
      assignedCoachIndex: playerCoachAssignments?.[p.id] ?? coach.coachIndex ?? 0,
    }));

    setPlayers(updatedPlayers);
    socketService.updateGameState('playing', selectedSong);
    setActiveScreen('gameplay');
  };

  const handleFinishRoutine = (updatedPlayers: Player[]) => {
    setPlayers(updatedPlayers);
    if (selectedSong) {
      socketService.updateGameState('results', selectedSong);
    }
    setActiveScreen('results');
  };

  const handleCustomSongSaved = (newSong: Song) => {
    setSongsList(getAllSongs());
    setSelectedSong(newSong);
    setSelectedCoach(newSong.coaches?.[0] || null);
    setShowTrainingStudio(false);
    setActiveScreen('coaches');
  };

  const handleDeleteSong = async (songId: string) => {
    await deleteCustomTrainedSong(songId);
    const updated = getAllSongs();
    setSongsList(updated);
    if (selectedSong?.id === songId) {
      setSelectedSong(updated[0] || null);
      setSelectedCoach(updated[0]?.coaches?.[0] || null);
    }
  };

  const handleSaveProfile = (updatedPrimaryPlayer: Player) => {
    setPlayers((prev) => [updatedPrimaryPlayer, ...prev.slice(1)]);
  };

  const handleResetLibrary = async () => {
    await clearAllCustomSongs();
    const updated = getAllSongs();
    setSongsList(updated);
    setSelectedSong(updated[0] || null);
    setSelectedCoach(updated[0]?.coaches?.[0] || null);
  };

  return (
    <div className="min-h-screen text-white relative font-sans flex flex-col justify-between p-2 md:p-4 select-none bg-surface-0 bg-radial-vignette">
      {/* Top Header Bar (Unified Primary Navigation - Single authoritative bar) */}
      {activeScreen !== 'gameplay' && (
        <div className="w-full lg:pr-16">
          <Header
            activeScreen={activeScreen}
            onNavigate={(s) => setActiveScreen(s)}
            onOpenTrainingStudio={() => setShowTrainingStudio(true)}
            onOpenPhonePairing={() => setShowPhoneModal(true)}
            onOpenYoloDiagnostic={() => setShowYoloDiagnostic(true)}
            onOpenProfileEditor={() => setShowProfileEditor(true)}
            onOpenStore={() => setShowStoreModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenNotifications={() => setShowNotificationsModal(true)}
            onOpenDancerCard={() => {
              setActiveDancerForCard(players[0]);
              setShowDancerCardModal(true);
            }}
            onImportCdnce={handleImportCdnceFile}
            primaryPlayer={players[0]}
            roomId={roomId}
          />
        </div>
      )}

      {/* Right Party / Dancers Console Rail (Desktop only) */}
      {activeScreen !== 'gameplay' && (
        <RightPartyPanel
          players={players}
          onOpenPhonePairing={() => setShowPhoneModal(true)}
          onOpenProfileEditor={() => setShowProfileEditor(true)}
          onOpenDancerCard={(p) => {
            setActiveDancerForCard(p);
            setShowDancerCardModal(true);
          }}
        />
      )}

      {/* Main Screen Views (Zero redundant navbar space, responsive layout) */}
      <main
        className={`relative z-10 flex-1 flex flex-col ${
          activeScreen !== 'gameplay' ? 'px-2 sm:px-4 pb-6 pt-1 lg:pr-16 max-w-[1440px] w-full mx-auto' : ''
        }`}
      >
        {activeScreen === 'home' && (
          <HomeScreen
            songs={songsList}
            players={players}
            onSelectSong={handleSongSelect}
            onNavigateToCatalog={() => setActiveScreen('songs')}
            onOpenTrainingStudio={() => setShowTrainingStudio(true)}
            onSongImported={handleSongImported}
          />
        )}

        {activeScreen === 'songs' && (
          <SongsCatalogScreen
            songs={songsList}
            primaryPlayer={players[0]}
            onSelectSong={handleSongSelect}
            onOpenTrainingStudio={() => setShowTrainingStudio(true)}
            onDeleteSong={handleDeleteSong}
            onSongImported={handleSongImported}
          />
        )}

        {activeScreen === 'coaches' && selectedSong && (
          <CoachSelectScreen
            song={selectedSong}
            players={players}
            onSelectCoachAndStart={handleStartRoutine}
            onBackToCatalog={() => setActiveScreen('songs')}
          />
        )}

        {activeScreen === 'coaches' && !selectedSong && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 text-2xl mb-4">
              <i className="fa-solid fa-compact-disc"></i>
            </div>
            <h3 className="text-xl font-bold uppercase tracking-wider mb-2">No Routine Selected</h3>
            <p className="text-zinc-400 text-sm max-w-sm mb-6">
              Select or import a routine to choose coaches and begin dancing.
            </p>
            <button
              onClick={() => setActiveScreen('songs')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 font-bold uppercase tracking-wider text-xs shadow-lg hover:brightness-110 cursor-pointer"
            >
              Browse Routines
            </button>
          </div>
        )}

        {activeScreen === 'gameplay' && selectedSong && selectedCoach && (
          <GameplayScreen
            song={selectedSong}
            coach={selectedCoach}
            players={players}
            hasCamera={hasCamera}
            onFinishRoutine={handleFinishRoutine}
            onExit={() => setActiveScreen('home')}
          />
        )}

        {activeScreen === 'results' && selectedSong && selectedCoach && (
          <ResultsScreen
            song={selectedSong}
            coach={selectedCoach}
            players={players}
            onPlayAgain={() => handleStartRoutine(selectedCoach)}
            onReturnHome={() => setActiveScreen('home')}
          />
        )}
      </main>

      {/* Training Studio Modal */}
      {showTrainingStudio && (
        <TrainingStudio
          onSongSaved={handleCustomSongSaved}
          onClose={() => setShowTrainingStudio(false)}
        />
      )}

      {/* Phone Pairing & Camera Testing Modal */}
      {showPhoneModal && (
        <PhonePairingModal
          roomId={roomId}
          players={players}
          hasCamera={hasCamera}
          onClose={() => setShowPhoneModal(false)}
          onUpdateCameraStatus={(camActive) => {
            console.log('Camera tested:', camActive);
          }}
        />
      )}

      {/* YOLO Multi-Person Detection Diagnostic Modal */}
      {showYoloDiagnostic && (
        <YoloDiagnosticModal onClose={() => setShowYoloDiagnostic(false)} />
      )}

      {/* Temporal Maintenance & Diagnostics Mode Modal */}
      {showMaintenanceMode && (
        <MaintenanceModeModal onClose={() => setShowMaintenanceMode(false)} />
      )}

      {/* Profile & Avatar Customization Modal */}
      {showProfileEditor && (
        <ProfileEditorModal
          player={players[0]}
          onSaveProfile={handleSaveProfile}
          onClose={() => setShowProfileEditor(false)}
        />
      )}

      {/* Settings Modal (Audio, Camera Sensitivity, Scaling, FPS, Cache) */}
      {showSettingsModal && (
        <SettingsModal
          hasCamera={hasCamera}
          onResetLibrary={handleResetLibrary}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* ColeDance+ Store Modal (Avatars, Glow Colors, VIP Pass) */}
      {showStoreModal && (
        <StoreModal
          player={players[0]}
          onUpdatePlayer={handleSaveProfile}
          onClose={() => setShowStoreModal(false)}
        />
      )}

      {/* Notifications Center Modal (Actionable alerts) */}
      {showNotificationsModal && (
        <NotificationsModal
          onClose={() => setShowNotificationsModal(false)}
          onOpenSongs={() => {
            setShowNotificationsModal(false);
            setActiveScreen('songs');
          }}
          onOpenTrainingStudio={() => {
            setShowNotificationsModal(false);
            setShowTrainingStudio(true);
          }}
          onOpenPhonePairing={() => {
            setShowNotificationsModal(false);
            setShowPhoneModal(true);
          }}
        />
      )}

      {/* Dancer Card Modal */}
      {showDancerCardModal && (
        <DancerCardModal
          player={activeDancerForCard}
          onOpenProfileEditor={() => {
            setShowDancerCardModal(false);
            setShowProfileEditor(true);
          }}
          onClose={() => setShowDancerCardModal(false)}
        />
      )}

      {/* Generic Modal Dialog */}
      {modalData && (
        <GenericModal
          title={modalData.title}
          body={modalData.body}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  );
}
