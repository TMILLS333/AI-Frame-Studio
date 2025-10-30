export type Step = 'upload' | 'theme' | 'generating' | 'result';

export interface Theme {
  id: string;
  name: string;
  description: string;
  iconName: string;
  prompt: string;
}

export interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface Colors {
  backgroundStart: string;
  backgroundEnd: string;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
}
