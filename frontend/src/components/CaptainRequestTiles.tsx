import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeftRight, 
  Pencil, 
  Users, 
  Tag, 
  Trophy, 
  Calendar,
  DoorOpen
} from 'lucide-react';
import type { RequestType } from '../services/RequestService';

interface RequestTileProps {
  icon: React.ReactNode;
  title: string;
  type: RequestType;
  onClick: (type: RequestType) => void;
  color: string;
}

const RequestTile: React.FC<RequestTileProps> = ({ icon, title, type, onClick, color }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<{ x: number, y: number, id: number }[]>([]);
  
  // Handle ripple effect
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsPressed(true);
    
    // Get position for ripple effect
    const tile = e.currentTarget.getBoundingClientRect();
    const x = e instanceof TouchEvent 
      ? e.touches[0].clientX - tile.left 
      : (e as React.MouseEvent).clientX - tile.left;
    const y = e instanceof TouchEvent 
      ? e.touches[0].clientY - tile.top 
      : (e as React.MouseEvent).clientY - tile.top;
    
    // Add ripple
    const id = Date.now();
    setRipples([...ripples, { x, y, id }]);
    
    // Clean up ripple after animation completes
    setTimeout(() => {
      setRipples(prevRipples => prevRipples.filter(r => r.id !== id));
    }, 600);
  };
  
  return (
    <div 
      className={`relative overflow-hidden rounded-lg p-6 ${color} transition-all duration-200 ease-out shadow-md cursor-pointer flex flex-col items-center justify-center ${isPressed ? 'scale-95' : 'scale-100'}`}
      style={{ minHeight: '180px', minWidth: '160px', touchAction: 'manipulation' }}
      onClick={() => onClick(type)}
      onTouchStart={handleTouchStart}
      onMouseDown={handleTouchStart}
      onTouchEnd={() => setIsPressed(false)}
      onMouseUp={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <span 
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-ripple"
          style={{
            left: ripple.x + 'px',
            top: ripple.y + 'px',
            width: '200px',
            height: '200px',
            marginLeft: '-100px',
            marginTop: '-100px',
          }}
        />
      ))}
      
      {/* Content */}
      <div className="relative z-10 text-white text-center">
        <div className="mb-4 p-3 bg-white/10 rounded-full inline-block">
          {icon}
        </div>
        <p className="font-semibold text-lg">{title}</p>
      </div>
    </div>
  );
};

interface CaptainRequestTilesProps {
  userId: string;
  teamId?: string;
  onRequestSelected: (type: RequestType) => void;
}

const CaptainRequestTiles: React.FC<CaptainRequestTilesProps> = ({ userId, teamId, onRequestSelected }) => {
  const navigate = useNavigate();
  
  // Handle tile click
  const handleRequestSelection = (type: RequestType) => {
    if (!teamId && type !== 'team_creation') {
      // Redirect to team creation if no team exists
      navigate('/team/create');
      return;
    }
    
    onRequestSelected(type);
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-white mb-6">Request Actions</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Team Transfer */}
        <RequestTile
          icon={<ArrowLeftRight className="w-8 h-8" />}
          title="Team Transfer"
          type="team_transfer"
          onClick={handleRequestSelection}
          color="bg-gradient-to-br from-blue-500/80 to-blue-600/80"
        />
        
        {/* Team Rebrand */}
        <RequestTile
          icon={<Pencil className="w-8 h-8" />}
          title="Team Rebrand"
          type="team_rebrand"
          onClick={handleRequestSelection}
          color="bg-gradient-to-br from-amber-500/80 to-amber-600/80"
        />
        
        {/* Roster Change */}
        <RequestTile
          icon={<Users className="w-8 h-8" />}
          title="Roster Change"
          type="roster_change"
          onClick={handleRequestSelection}
          color="bg-gradient-to-br from-purple-500/80 to-purple-600/80"
        />
        
        {/* Online ID Change */}
        <RequestTile
          icon={<Tag className="w-8 h-8" />}
          title="Online ID"
          type="online_id_change"
          onClick={handleRequestSelection}
          color="bg-gradient-to-br from-green-500/80 to-green-600/80"
        />
        
        {/* Tournament Registration */}
        <RequestTile
          icon={<Trophy className="w-8 h-8" />}
          title="Tournament"
          type="tournament_registration"
          onClick={handleRequestSelection}
          color="bg-gradient-to-br from-red-500/80 to-red-600/80"
        />
        
        {/* League Registration */}
        <RequestTile
          icon={<Calendar className="w-8 h-8" />}
          title="League"
          type="league_registration"
          onClick={handleRequestSelection}
          color="bg-gradient-to-br from-cyan-500/80 to-cyan-600/80"
        />
        
        {/* Team Creation - Only show if no team exists */}
        {!teamId && (
          <RequestTile
            icon={<DoorOpen className="w-8 h-8" />}
            title="Create Team"
            type="team_creation"
            onClick={handleRequestSelection}
            color="bg-gradient-to-br from-emerald-500/80 to-emerald-600/80"
          />
        )}
      </div>
    </div>
  );
};

export default CaptainRequestTiles; 