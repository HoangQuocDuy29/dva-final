import React from 'react';
import {
  Booking,
  Court,
  MemberApplication,
  NewsPost,
  Player,
  TrainingRegistration,
  TrainingCourse,
  CoachProfile,
  User as UserType,
  ClosedSlot,
  StoreProduct,
  StoreOrder,
  StoreSubView,
} from '../../types';

export type AdminTabId =
  | 'OVERVIEW'
  | 'COURTS'
  | 'BOOKINGS'
  | 'APPLICATIONS'
  | 'PLAYERS'
  | 'TRAINING'
  | 'COACHES'
  | 'NEWS'
  | 'USERS'
  | 'SHEETS'
  | 'STORE'
  | 'TOURNAMENTS';

export type AdminNavGroupId = 'OVERVIEW' | 'ATHLETICS' | 'COMMERCE' | 'SYSTEM';

export interface AdminNavItem {
  id: AdminTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  superAdminOnly?: boolean;
  status?: 'NEW' | 'SOON';
}

export interface AdminNavGroup {
  id: AdminNavGroupId;
  label: string;
  items: AdminNavItem[];
}

export type FeedbackState = string | null;

export interface CourtSelectionState {
  selectedManageCourtId: string;
  setSelectedManageCourtId: React.Dispatch<React.SetStateAction<string>>;
  adminSelectedSubCourt: string;
  setAdminSelectedSubCourt: React.Dispatch<React.SetStateAction<string>>;
  selectedManageDate: string;
  setSelectedManageDate: React.Dispatch<React.SetStateAction<string>>;
}

export interface AdminDataState {
  bookings: Booking[];
  courtsList: Court[];
  applications: MemberApplication[];
  trainingRegs: TrainingRegistration[];
  coursesList: TrainingCourse[];
  coachesList: CoachProfile[];
  players: Player[];
  newsList: NewsPost[];
  sheetsData: any;
  closedSlots: ClosedSlot[];
  storeProducts: StoreProduct[];
  storeOrders: StoreOrder[];
}

export interface AdminDataSetters {
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  setCourtsList: React.Dispatch<React.SetStateAction<Court[]>>;
  setApplications: React.Dispatch<React.SetStateAction<MemberApplication[]>>;
  setTrainingRegs: React.Dispatch<React.SetStateAction<TrainingRegistration[]>>;
  setCoursesList: React.Dispatch<React.SetStateAction<TrainingCourse[]>>;
  setCoachesList: React.Dispatch<React.SetStateAction<CoachProfile[]>>;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setNewsList: React.Dispatch<React.SetStateAction<NewsPost[]>>;
  setSheetsData: React.Dispatch<React.SetStateAction<any>>;
  setClosedSlots: React.Dispatch<React.SetStateAction<ClosedSlot[]>>;
  setStoreProducts: React.Dispatch<React.SetStateAction<StoreProduct[]>>;
  setStoreOrders: React.Dispatch<React.SetStateAction<StoreOrder[]>>;
}

export interface AdminDashboardContextValue {
  currentUser: UserType;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  onOpenSheets: () => void;
  handleLogout: () => void;
  activeModule: AdminTabId;
  setActiveModule: (mod: AdminTabId | string, subView?: string) => void;
  storeSubView: StoreSubView;
  setStoreSubView: (view: StoreSubView) => void;
  feedback: FeedbackState;
  setFeedback: React.Dispatch<React.SetStateAction<FeedbackState>>;
  notify: (message: string, durationMs?: number) => void;
  loading: boolean;
  fetchData: () => Promise<void>;
  data: AdminDataState;
  setData: AdminDataSetters;
  courtSelection: CourtSelectionState;
  isGuestModalOpen: boolean;
  setIsGuestModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  guestModalError: string | null;
  setGuestModalError: React.Dispatch<React.SetStateAction<string | null>>;
  openGuestModal: () => void;
  closeGuestModal: () => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
