export interface CustomOption {
  id: string;
  name: string;
  value: number;
}

export interface CostingDetails {
  styleNumber: string;
  
  // Production components
  pocket: number;
  stitch: number;
  shoulder: number;
  armhole: number;
  sidejoint: number;
  neck: number;
  hood: number;
  paiping: number;
  placket: number;
  ribCuff: number;
  bottom: number;
  vJoint: number;
  pottyJoint: number;
  sample: number;
  complete: number;
  body: number;
  newOption: number;
  customOptions?: CustomOption[];
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  text: string;
  createdAt: number;
}

export interface Sweater {
  id: string;
  name: string;
  image: string;
  createdAt: number;
  costing: CostingDetails;
  reactions?: Record<string, string>; // userId -> reactionType ('like', 'heart', 'fire', etc.)
  comments?: Comment[];
}

export interface Worker {
  id: string;
  name: string;
  phone: string;
  factoryName: string;
  cardNumber: string;
  lineNumber: string;
  image?: string;
  joinedAt: number;
  department?: 'leward' | 'complete';
  isVerified?: boolean;
  balance?: number;
}

export interface SupervisorEntry {
  id: string;
  name: string;
  cardNumber: string;
  presence: string; 
  absent: string;   
  target: string;
  achievement: string;
}

export interface SupervisorReport {
  id: string;
  date: string;
  entries: SupervisorEntry[];
  updatedAt: number;
}

export interface ImportantNote {
  id: string;
  personName: string;
  role: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  updatedAt: number;
}


export interface CostingReport {
  id: string;
  workerId: string;
  items: any[];
  totalEarnings: number;
  totalCost: number;
  netProfit: number;
  updatedAt: number;
}


export interface SalaryReport {
  id: string;
  workerId: string;
  month: number;
  year: number;
  headers: {
    companyName: string;
    name: string;
    card: string;
    month: string;
    section: string;
    supervisor: string;
    line: string;
    year: string;
  };
  styles: string[];
  grid: Record<number, Record<number, string>>;
  signatures: string[];
  remarks: string;
  updatedAt: number;
}


export interface QILog {
  id: string;
  workerId: string;
  workerName: string;
  workerImage?: string;
  cardNumber: string;
  tcNumber: string;
  machineNumber: string;
  qty: number;
  createdAt: number;
}

export interface WorkLog {
  id: string;
  workerId: string;
  sweaterId: string;
  styleNumber: string;
  operation: keyof Omit<CostingDetails, 'styleNumber'>;
  quantity: number;
  rate: number;
  total: number;
  date: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  senderPhone?: string;
  senderCardNumber?: string;
  text?: string;
  audio?: string;
  createdAt: number;
}

export interface Problem {
  id: string;
  workerId: string;
  workerName: string;
  workerImage?: string;
  workerCardNumber?: string;
  styleNumber: string;
  category: string;
  note: string;
  createdAt: number;
  status: 'pending' | 'resolved';
}

export const initialCosting: CostingDetails = {
  styleNumber: '',
  pocket: 0,
  stitch: 0,
  shoulder: 0,
  armhole: 0,
  sidejoint: 0,
  neck: 0,
  hood: 0,
  paiping: 0,
  placket: 0,
  ribCuff: 0,
  bottom: 0,
  vJoint: 0,
  pottyJoint: 0,
  sample: 0,
  complete: 0,
  body: 0,
  newOption: 0,
  customOptions: [],
};

export const OPERATIONS: (keyof Omit<CostingDetails, 'styleNumber'>)[] = [
  'pocket', 'stitch', 'shoulder', 'armhole', 'sidejoint', 'neck', 'body', 'hood',
  'paiping', 'placket', 'ribCuff', 'bottom', 'vJoint', 'pottyJoint',
  'sample', 'complete', 'newOption'
];

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface CompanyStyle {
  id: string;
  styleName: string;
  imageUrl?: string;
  rates: {
    [key: string]: number;
  };
}

export interface CompanyRate {
  id: string;
  companyName: string;
  styles: CompanyStyle[];
  createdAt: number;
}

