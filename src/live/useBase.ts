/**
 * The levelled base, read when a sheet opens and replaced by whatever the
 * server answers to a start, a purchase or a finished timer.
 */
import {useEffect, useState} from 'react';
import {type BaseLevelsView, type SeasonState, api} from '../net/api';

export function useBase(): [BaseLevelsView | null, (next: BaseLevelsView) => void] {
  const [base, setBase] = useState<BaseLevelsView | null>(null);
  useEffect(() => {
    let live = true;
    api
      .baseLevels()
      .then((b) => live && setBase(b))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return [base, setBase];
}

/** Construction, shield and guide state, read when a sheet opens. */
export function useSeason(): [SeasonState | null, (next: SeasonState) => void] {
  const [state, setState] = useState<SeasonState | null>(null);
  useEffect(() => {
    let live = true;
    api
      .season()
      .then((s) => live && setState(s))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return [state, setState];
}
