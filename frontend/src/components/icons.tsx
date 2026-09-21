import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AlertCircleIcon,
  AlertDiamondIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Bookmark01Icon,
  Calendar03Icon,
  Tick02Icon,
  TickDouble02Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock01Icon,
  Copy01Icon,
  Download04Icon,
  EyeIcon,
  FastForwardIcon,
  Film02Icon,
  FilterHorizontalIcon,
  Folder01Icon,
  FolderArchiveIcon,
  FolderHeartIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  GridIcon,
  HardDriveIcon,
  HashIcon,
  HistoryIcon,
  Image02Icon,
  InformationCircleIcon,
  Layers02Icon,
  LoaderCircleIcon,
  Maximize04Icon,
  PauseIcon,
  PieChart02Icon,
  PlayIcon,
  PlusSignIcon,
  RefreshIcon,
  RotateCcwIcon,
  Search01Icon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SmartPhone01Icon,
  SparklesIcon,
  StarIcon,
  Delete02Icon,
  Video02Icon,
  VolumeHighIcon,
  VolumeXIcon,
  XIcon,
  CancelCircleIcon,
  ZoomInIcon,
  ZoomOutIcon,
  Activity01Icon,
  CheckmarkSquare01Icon as CheckSquareIcon,
  Square01Icon,
  FileQuestionMarkIcon,
  DashboardBrowsingIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SaveAllIcon,
  Settings01Icon,
  ShieldAlertIcon,
  Database02Icon,
  FileCheckIcon,
  PaintBoardIcon,
} from '@hugeicons/core-free-icons';

interface IconProps {
  className?: string;
  strokeWidth?: number;
}

const make = (icon: unknown) =>
  ({ className, strokeWidth = 1.5 }: IconProps) => (
    <HugeiconsIcon icon={icon as never} size={16} strokeWidth={strokeWidth} className={className} />
  );

export const AlertCircle = make(AlertCircleIcon);
export const AlertTriangle = make(AlertDiamondIcon);
export const ArrowLeft = make(ArrowLeft01Icon);
export const ArrowRight = make(ArrowRight01Icon);
export const ArrowUpRight = make(ArrowUpRight01Icon);
export const Bookmark = make(Bookmark01Icon);
export const Calendar = make(Calendar03Icon);
export const Check = make(Tick02Icon);
export const CheckCircle = make(Tick02Icon);
export const CheckCircle2 = make(TickDouble02Icon);
export const ChevronLeft = make(ChevronLeftIcon);
export const ChevronRight = make(ChevronRightIcon);
export const Clock = make(Clock01Icon);
export const Copy = make(Copy01Icon);
export const Download = make(Download04Icon);
export const Eye = make(EyeIcon);
export const FastForward = make(FastForwardIcon);
export const Film = make(Film02Icon);
export const Filter = make(FilterHorizontalIcon);
export const Folder = make(Folder01Icon);
export const FolderArchive = make(FolderArchiveIcon);
export const FolderHeart = make(FolderHeartIcon);
export const FolderOpen = make(FolderOpenIcon);
export const FolderPlus = make(FolderPlusIcon);
export const Grid = make(GridIcon);
export const HardDrive = make(HardDriveIcon);
export const Hash = make(HashIcon);
export const History = make(HistoryIcon);
export const Image = make(Image02Icon);
export const Info = make(InformationCircleIcon);
export const Layers = make(Layers02Icon);
export const Loader2 = make(LoaderCircleIcon);
export const Maximize = make(Maximize04Icon);
export const Maximize2 = make(Maximize04Icon);
export const Pause = make(PauseIcon);
export const PieChart = make(PieChart02Icon);
export const Play = make(PlayIcon);
export const Plus = make(PlusSignIcon);
export const RefreshCw = make(RefreshIcon);
export const RotateCcw = make(RotateCcwIcon);
export const Search = make(Search01Icon);
export const ShieldCheck = make(ShieldCheckIcon);
export const SlidersHorizontal = make(SlidersHorizontalIcon);
export const Smartphone = make(SmartPhone01Icon);
export const Sparkles = make(SparklesIcon);
export const Star = make(StarIcon);
export const Trash2 = make(Delete02Icon);
export const Video = make(Video02Icon);
export const Volume2 = make(VolumeHighIcon);
export const VolumeX = make(VolumeXIcon);
export const X = make(XIcon);
export const XCircle = make(CancelCircleIcon);
export const ZoomIn = make(ZoomInIcon);
export const ZoomOut = make(ZoomOutIcon);
export const Activity = make(Activity01Icon);
export const CheckSquare = make(CheckSquareIcon);
export const Square = make(Square01Icon);
export const FileQuestion = make(FileQuestionMarkIcon);
export const LayoutDashboard = make(DashboardBrowsingIcon);
export const PanelLeftClose = make(PanelLeftCloseIcon);
export const PanelLeftOpen = make(PanelLeftOpenIcon);
export const Save = make(SaveAllIcon);
export const Settings = make(Settings01Icon);
export const ShieldAlert = make(ShieldAlertIcon);
export const Database = make(Database02Icon);
export const FileCheck = make(FileCheckIcon);
export const Palette = make(PaintBoardIcon);
