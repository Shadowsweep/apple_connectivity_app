import argparse
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from app.device.iphone import LocalFolderDevice, MockIPhoneDevice
from app.duplicate.detector import DuplicateDetector
from app.filters.media_filter import FilterCriteria, MediaFilter
from app.importer.importer import SafeImporter
from app.organizer.organizer import MediaOrganizer
from app.scanner.metadata import MediaItem, MediaType
from app.scanner.scanner import MediaScanner
from app.storage.manager import StorageManager


class MemeEasyCLI:
    def __init__(self, default_library: Optional[Path] = None):
        base_dir = Path(__file__).resolve().parent
        self.default_library_path = default_library or (base_dir / "Library")
        self.storage_manager = StorageManager(self.default_library_path)
        self.organizer = MediaOrganizer(self.storage_manager.library_root)
        self.duplicate_detector = DuplicateDetector(self.storage_manager.library_root)
        self.importer = SafeImporter(self.storage_manager, self.organizer, self.duplicate_detector)

        self.mock_fixture_path = base_dir / "tests" / "fixtures" / "fake_iphone"
        self.active_device = MockIPhoneDevice(self.mock_fixture_path)
        self.scanned_items: List[MediaItem] = []
        self.filtered_items: List[MediaItem] = []
        self.filter_criteria = FilterCriteria()

    def print_banner(self):
        print("========================================")
        print("                MEMEASY                 ")
        print("   Local-First iPhone Media Platform    ")
        print("========================================")
        print(f"Library Destination : {self.storage_manager.library_root}")
        stats = self.storage_manager.get_storage_stats()
        print(f"Available Space     : {stats.formatted_free} (Usable: {stats.formatted_usable}, 10GB reserve)")
        print(f"Active Device       : {self.active_device.name}")
        print("----------------------------------------")

    def run_menu(self):
        while True:
            self.print_banner()
            print("1. Select Library Destination")
            print("2. Scan Connected Device")
            print("3. Configure Filters")
            print("4. Preview Import")
            print("5. Execute Safe Import")
            print("6. Exit")
            print("----------------------------------------")
            choice = input("Choose option [1-6]: ").strip()

            if choice == "1":
                self.action_select_library()
            elif choice == "2":
                self.action_scan_device()
            elif choice == "3":
                self.action_configure_filters()
            elif choice == "4":
                self.action_preview_import()
            elif choice == "5":
                self.action_execute_import()
            elif choice == "6" or choice.lower() == "exit":
                print("Exiting MEMEASY.")
                sys.exit(0)
            else:
                print("\n[!] Invalid choice, try again.\n")

    def action_select_library(self):
        print("\n--- Select Library Destination ---")
        current = str(self.storage_manager.library_root)
        path_str = input(f"Enter target path [{current}]: ").strip()
        if not path_str:
            path_str = current

        new_path = Path(path_str).resolve()
        temp_mgr = StorageManager(new_path)
        ok, msg = temp_mgr.validate_destination()
        if ok:
            self.storage_manager = temp_mgr
            self.organizer = MediaOrganizer(self.storage_manager.library_root)
            self.duplicate_detector = DuplicateDetector(self.storage_manager.library_root)
            self.importer = SafeImporter(self.storage_manager, self.organizer, self.duplicate_detector)
            print(f"[OK] Library destination updated: {new_path}\n")
        else:
            print(f"[FAIL] Error: {msg}\n")

    def action_scan_device(self):
        print(f"\n--- Scanning Device: {self.active_device.name} ---")
        if not self.active_device.is_connected:
            print(f"[!] Device path {self.mock_fixture_path} not found.")
            print("[i] Generating synthetic test fixture...")
            from tests.fixtures.fake_iphone_generator import create_mock_iphone_fixture
            create_mock_iphone_fixture(self.mock_fixture_path)

        scanner = MediaScanner(self.active_device)
        self.scanned_items = scanner.scan()
        print(f"[OK] Discovered {len(self.scanned_items)} media items on device.")

        # Re-apply filters
        media_filter = MediaFilter(self.filter_criteria)
        res = media_filter.apply(self.scanned_items)
        self.filtered_items = res.accepted
        print(f"[OK] {len(self.filtered_items)} items match current filter criteria.\n")

    def action_configure_filters(self):
        print("\n--- Configure Import Filters ---")
        print(f"Current Date From : {self.filter_criteria.date_from or 'None'}")
        print(f"Current Date To   : {self.filter_criteria.date_to or 'None'}")
        print(f"Allowed Types     : {[t.value for t in self.filter_criteria.allowed_types]}")
        print(f"Min Video Size    : {self.filter_criteria.min_video_size_bytes or 'None'}")

        change_date = input("Set date filter? (y/n) [n]: ").strip().lower()
        if change_date == "y":
            df_str = input("Date From (YYYY-MM-DD) [empty for none]: ").strip()
            dt_str = input("Date To (YYYY-MM-DD) [empty for none]: ").strip()
            self.filter_criteria.date_from = datetime.strptime(df_str, "%Y-%m-%d") if df_str else None
            self.filter_criteria.date_to = datetime.strptime(dt_str, "%Y-%m-%d") if dt_str else None

        if self.scanned_items:
            media_filter = MediaFilter(self.filter_criteria)
            res = media_filter.apply(self.scanned_items)
            self.filtered_items = res.accepted
            print(f"[OK] Filter updated: {len(self.filtered_items)} accepted / {len(res.rejected)} rejected.\n")

    def action_preview_import(self):
        if not self.scanned_items:
            self.action_scan_device()

        print("\n========================================")
        print("             IMPORT PREVIEW             ")
        print("========================================")
        preview = self.importer.preview(self.filtered_items)
        print(f"Photos           : {preview.photos_count}")
        print(f"Videos           : {preview.videos_count}")
        print(f"Screenshots      : {preview.screenshots_count}")
        print(f"Live Photos      : {preview.live_photos_count}")
        print("----------------------------------------")
        print(f"Already Imported : {preview.already_imported_count}")
        print(f"New to Import    : {preview.new_items_count}")
        print(f"Required Space   : {preview.formatted_required}")
        print(f"Available Space  : {preview.storage_stats.formatted_free} (Usable: {preview.storage_stats.formatted_usable})")
        print(f"Safety Reserve   : {preview.storage_stats.formatted_reserve}")
        print("========================================")

        if not preview.can_fit:
            print("[FAIL] WARNING: Insufficient usable disk space to import all new items safely.\n")
        else:
            print("[OK] Storage verification PASSED.\n")

    def action_execute_import(self):
        if not self.filtered_items:
            print("\n[!] No items scanned. Scanning device first...")
            self.action_scan_device()

        preview = self.importer.preview(self.filtered_items)
        if preview.new_items_count == 0:
            print("\n[i] All items are already imported. Nothing to copy.\n")
            return

        print(f"\n[i] Ready to import {preview.new_items_count} new items ({preview.formatted_required}).")
        confirm = input("Proceed with safe import? (y/n) [y]: ").strip().lower()
        if confirm not in ("", "y", "yes"):
            print("[i] Import cancelled.")
            return

        print("\n--- Starting Safe Ingestion ---")
        def progress(current, total, item, status):
            print(f"[{current}/{total}] {item.filename}: {status}")

        summary = self.importer.execute_import(
            items=self.filtered_items,
            device=self.active_device,
            progress_callback=progress,
        )

        print("\n========================================")
        print("             IMPORT SUMMARY             ")
        print("========================================")
        print(f"Successful       : {summary.successful_count}")
        print(f"Duplicates Skipped: {summary.duplicates_skipped_count}")
        print(f"Failed           : {summary.failed_count}")
        print(f"Skipped (Space)  : {summary.skipped_space_count}")
        print(f"Total Bytes      : {summary.formatted_bytes}")
        print("========================================\n")


def main():
    parser = argparse.ArgumentParser(description="MEMEASY Local Media Engine")
    parser.add_argument("--library", type=str, help="Path to destination library")
    parser.add_argument("--mock-device", type=str, help="Path to mock device directory")
    args = parser.parse_args()

    lib_path = Path(args.library) if args.library else None
    cli = MemeEasyCLI(default_library=lib_path)
    if args.mock_device:
        cli.active_device = LocalFolderDevice(Path(args.mock_device), name="Custom Source")

    cli.run_menu()


if __name__ == "__main__":
    main()
