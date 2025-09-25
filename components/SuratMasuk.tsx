import React, { useState, useMemo } from 'react';
import { SuratMasuk as TSuratMasuk, KategoriSurat, SifatSurat, User, AnySurat, KopSuratSettings, AppSettings, FolderArsip, UnitKerja, TipeSurat, SifatDisposisi, StatusDisposisi, SuratMasuk as SuratMasukType, Komentar, Tugas } from '../types';
import { PlusIcon, SearchIcon, RefreshIcon, ArchiveIcon } from './icons';
// FIX: Changed import to be a named import.
import { SuratFormModal } from './SuratFormModal';
import SuratDetailModal from './SuratDetailModal';
import PilihFolderArsipModal from './PilihFolderArsipModal';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

interface SuratMasukProps {
    suratList: TSuratMasuk[];
    kategoriList: KategoriSurat[];
    unitKerjaList: UnitKerja[];
    allUsers: User[];
    currentUser: User;
    allSurat: AnySurat[];
    kopSuratSettings: KopSuratSettings;
    appSettings: AppSettings;
    folders: FolderArsip[];
    onSubmit: (surat: Omit<AnySurat, 'id' | 'isArchived' | 'fileUrl' | 'unitKerjaId' | 'disposisi' | 'komentar' | 'tugasTerkait' | 'dokumenTerkait'>) => void;
    onUpdate: (surat: AnySurat) => void;
    onArchive: (suratId: string, folderId: string) => void;
    onBulkArchive: (suratIds: string[], folderId: string) => void;
    onAddDisposisi: (suratId: string, catatan: string, tujuanId: string, sifat: SifatDisposisi) => void;
    onUpdateDisposisiStatus: (suratId: string, disposisiId: string, status: StatusDisposisi) => void;
    onReplyWithAI: (surat: TSuratMasuk) => void;
    onAddKomentar: (suratId: string, teks: string) => void;
    onAddTask: (tugas: Omit<Tugas, 'id'>) => void;
}

const SuratMasuk: React.FC<SuratMasukProps> = (props) => {
    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
    const [selectedSurat, setSelectedSurat] = useState<TSuratMasuk | null>(null);
    const [suratToEdit, setSuratToEdit] = useState<TSuratMasuk | null>(null);
    const [suratToArchive, setSuratToArchive] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);


    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sifatFilter, setSifatFilter] = useState('');
    const [kategoriFilter, setKategoriFilter] = useState('');
    const [unitKerjaFilter, setUnitKerjaFilter] = useState('');


    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const filteredSurat = useMemo(() => {
        return props.suratList
            .filter(s => {
                const searchLower = debouncedSearchTerm.toLowerCase();
                return (
                    s.perihal.toLowerCase().includes(searchLower) ||
                    s.nomorSurat.toLowerCase().includes(searchLower) ||
                    s.pengirim.toLowerCase().includes(searchLower)
                );
            })
            .filter(s => sifatFilter === '' || s.sifat === sifatFilter)
            .filter(s => kategoriFilter === '' || s.kategoriId === kategoriFilter)
            .filter(s => {
                if (unitKerjaFilter === '') return true;
                const pengirimUnit = props.unitKerjaList.find(u => u.id === unitKerjaFilter);
                return pengirimUnit ? s.pengirim === pengirimUnit.nama : false;
            })
            .filter(s => {
                if (!startDate || !endDate) return true;
                const suratDate = new Date(s.tanggalDiterima);
                return suratDate >= new Date(startDate) && suratDate <= new Date(endDate);
            });
    }, [props.suratList, debouncedSearchTerm, sifatFilter, kategoriFilter, unitKerjaFilter, startDate, endDate, props.unitKerjaList]);


    const handleOpenDetail = (surat: TSuratMasuk) => {
        setSelectedSurat(surat);
        setDetailModalOpen(true);
    };

    const handleOpenEdit = (surat: TSuratMasuk) => {
        setSuratToEdit(surat);
        setFormModalOpen(true);
    };

    const handleOpenArchive = (suratId: string) => {
        setSuratToArchive(suratId);
        setArchiveModalOpen(true);
    };
    
    const handleConfirmArchive = (folderId: string) => {
        if (selectedIds.length > 0) {
            props.onBulkArchive(selectedIds, folderId);
            setSelectedIds([]);
        } else if (suratToArchive) {
            props.onArchive(suratToArchive, folderId);
        }
        setArchiveModalOpen(false);
        setSuratToArchive(null);
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setSifatFilter('');
        setKategoriFilter('');
        setUnitKerjaFilter('');
    };
    
    const handleFormSubmit = (suratData: Omit<AnySurat, 'id' | 'isArchived' | 'disposisi' | 'fileUrl' | 'unitKerjaId' | 'komentar' | 'tugasTerkait' | 'dokumenTerkait'> | AnySurat) => {
        if ('id' in suratData) {
            props.onUpdate(suratData as AnySurat);
        } else {
            props.onSubmit(suratData as Omit<SuratMasukType, 'id' | 'isArchived' | 'fileUrl' | 'unitKerjaId' | 'disposisi' | 'komentar' | 'tugasTerkait' | 'dokumenTerkait'>);
        }
        setFormModalOpen(false);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredSurat.map(s => s.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };
    
    const getSifatBadge = (sifat: SifatSurat) => {
        const colorMap = {
            [SifatSurat.BIASA]: 'bg-slate-100 text-slate-800',
            [SifatSurat.PENTING]: 'bg-sky-100 text-sky-800',
            [SifatSurat.SANGAT_PENTING]: 'bg-amber-100 text-amber-800',
            [SifatSurat.RAHASIA]: 'bg-red-100 text-red-800',
        };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorMap[sifat]}`}>{sifat}</span>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h3 className="text-xl font-bold text-slate-800">Daftar Surat Masuk</h3>
                    <button onClick={() => { setSuratToEdit(null); setFormModalOpen(true); }} className="flex items-center bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Tambah Surat Masuk
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end mb-4 p-4 bg-slate-50 rounded-lg border">
                    <div className="col-span-1 lg:col-span-2 xl:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cari</label>
                        <div className="relative">
                           <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                           <input type="text" placeholder="Perihal, nomor, pengirim..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tgl. Diterima (Mulai)</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tgl. Diterima (Akhir)</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500" />
                    </div>
                     <div className="col-span-1 md:col-span-2 lg:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sifat</label>
                        <select value={sifatFilter} onChange={e => setSifatFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 bg-white">
                            <option value="">Semua Sifat</option>
                            {Object.values(SifatSurat).map(s => <option key={s as string} value={s as string}>{s}</option>)}
                        </select>
                    </div>
                    <div className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                        <select value={kategoriFilter} onChange={e => setKategoriFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 bg-white">
                            <option value="">Semua Kategori</option>
                            {props.kategoriList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                        </select>
                    </div>
                    <div className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Unit Kerja Pengirim</label>
                        <select value={unitKerjaFilter} onChange={e => setUnitKerjaFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 bg-white">
                            <option value="">Semua Unit</option>
                            {props.unitKerjaList.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
                        </select>
                    </div>
                     <div className="col-span-full xl:col-span-1">
                        <button onClick={handleResetFilters} className="w-full flex items-center justify-center bg-slate-500 text-white px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors shadow">
                            <RefreshIcon className="w-5 h-5 mr-2" />
                            Atur Ulang
                        </button>
                    </div>
                </div>

                {/* Bulk Actions Toolbar */}
                {selectedIds.length > 0 && (
                    <div className="bg-slate-700 text-white p-3 rounded-lg mb-4 flex items-center justify-between">
                        <span className="font-medium text-sm">{selectedIds.length} surat dipilih</span>
                        <button onClick={() => setArchiveModalOpen(true)} className="flex items-center bg-emerald-500 text-white px-3 py-1.5 rounded-md hover:bg-emerald-600 text-sm font-medium">
                            <ArchiveIcon className="w-4 h-4 mr-2" />
                            Arsipkan Terpilih
                        </button>
                    </div>
                )}


                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                            <tr>
                                <th scope="col" className="p-4">
                                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                                        checked={selectedIds.length === filteredSurat.length && filteredSurat.length > 0}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th scope="col" className="px-6 py-3">Nomor Surat</th>
                                <th scope="col" className="px-6 py-3">Perihal</th>
                                <th scope="col" className="px-6 py-3">Pengirim</th>
                                <th scope="col" className="px-6 py-3">Tgl. Diterima</th>
                                <th scope="col" className="px-6 py-3">Sifat</th>
                                <th scope="col" className="px-6 py-3">Disposisi</th>
                                <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSurat.map(surat => (
                                <tr key={surat.id} className={`bg-white border-b hover:bg-slate-50 ${selectedIds.includes(surat.id) ? 'bg-slate-100' : ''}`}>
                                    <td className="p-4">
                                         <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                                            checked={selectedIds.includes(surat.id)}
                                            onChange={() => handleSelectOne(surat.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{surat.nomorSurat}</td>
                                    <td className="px-6 py-4 max-w-xs truncate">{surat.perihal}</td>
                                    <td className="px-6 py-4">{surat.pengirim}</td>
                                    <td className="px-6 py-4">{new Date(surat.tanggalDiterima).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">{getSifatBadge(surat.sifat)}</td>
                                    <td className="px-6 py-4">{surat.disposisi.length > 0 ? `${surat.disposisi.length} disposisi` : 'Belum ada'}</td>
                                    <td className="px-6 py-4 text-center space-x-2">
                                        <button onClick={() => handleOpenDetail(surat)} className="font-medium text-blue-600 hover:text-blue-800">Detail</button>
                                        <button onClick={() => handleOpenEdit(surat)} className="font-medium text-amber-600 hover:text-amber-800">Edit</button>
                                        <button onClick={() => handleOpenArchive(surat.id)} className="font-medium text-emerald-600 hover:text-emerald-800">Arsip</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <SuratFormModal
                isOpen={isFormModalOpen}
                onClose={() => setFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                tipe={TipeSurat.MASUK}
                kategoriList={props.kategoriList}
                unitKerjaList={props.unitKerjaList}
                currentUser={props.currentUser}
                suratToEdit={suratToEdit}
            />

            {selectedSurat && (
                <SuratDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    surat={selectedSurat}
                    kategoriList={props.kategoriList}
                    allUsers={props.allUsers}
                    currentUser={props.currentUser}
                    onArchive={() => handleOpenArchive(selectedSurat.id)}
                    onAddDisposisi={props.onAddDisposisi}
                    onUpdateDisposisiStatus={props.onUpdateDisposisiStatus}
                    onTambahTandaTangan={() => {}} // Not applicable for Surat Masuk
                    onReplyWithAI={props.onReplyWithAI}
                    onAddKomentar={props.onAddKomentar}
                    kopSuratSettings={props.kopSuratSettings}
                    appSettings={props.appSettings}
                    allSurat={props.allSurat}
                    unitKerjaList={props.unitKerjaList}
                    onAddTask={props.onAddTask}
                />
            )}
            
            <PilihFolderArsipModal
                isOpen={isArchiveModalOpen}
                onClose={() => setArchiveModalOpen(false)}
                onSubmit={handleConfirmArchive}
                folders={props.folders}
            />

        </div>
    );
};

export default SuratMasuk;
