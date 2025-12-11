import React from 'react';
import SnowEffect from './SnowEffect';

type EffectType = 'snow' | 'none';

interface BackgroundEffectsProps {
    effect?: EffectType;
    enabled?: boolean;
}

const BackgroundEffects: React.FC<BackgroundEffectsProps> = ({
    effect = 'snow',
    enabled = true
}) => {
    if (!enabled) return null;

    return (
        <div className="background-effects">
            {effect === 'snow' && <SnowEffect count={100} speed={1} />}
            {/* Future effects can be added here */}
        </div>
    );
};

export default BackgroundEffects;
