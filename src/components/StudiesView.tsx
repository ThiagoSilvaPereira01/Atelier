import React, { useState } from 'react';
import { BookOpen, GraduationCap, Plus, Trash2, Clock } from 'lucide-react';
import type { Course, StudyReading, ReadingStatus } from '../types';

interface StudiesViewProps {
  courses: Course[];
  readings: StudyReading[];
  internshipHoursDone: number;
  internshipHoursTarget: number;
  onUpdateInternshipHours: (done: number, target: number) => void;
  onAddCourse: (course: Omit<Course, 'id'>) => void;
  onUpdateCourse: (id: string, partial: Partial<Course>) => void;
  onDeleteCourse: (id: string) => void;
  onAddReading: (reading: Omit<StudyReading, 'id'>) => void;
  onUpdateReadingStatus: (id: string, status: ReadingStatus) => void;
  onDeleteReading: (id: string) => void;
}

const READING_STATUSES: ReadingStatus[] = ['A ler', 'Lendo', 'Fichado'];

export const StudiesView: React.FC<StudiesViewProps> = ({
  courses,
  readings,
  internshipHoursDone,
  internshipHoursTarget,
  onUpdateInternshipHours,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onAddReading,
  onUpdateReadingStatus,
  onDeleteReading,
}) => {
  const [courseName, setCourseName] = useState('');
  const [semester, setSemester] = useState('7º Semestre');
  const [professor, setProfessor] = useState('');
  const [nextExam, setNextExam] = useState('');

  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [bookCourse, setBookCourse] = useState('');
  const [bookNotes, setBookNotes] = useState('');

  const pct = Math.min(
    100,
    Math.round((internshipHoursDone / Math.max(1, internshipHoursTarget)) * 100)
  );

  const handleCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    onAddCourse({
      name: courseName.trim(),
      semester: semester.trim() || 'Atual',
      professor: professor.trim() || 'A definir',
      progress: 0,
      absences: 0,
      maxAbsences: 10,
      nextExam: nextExam.trim() || undefined,
    });
    setCourseName('');
    setProfessor('');
    setNextExam('');
  };

  const handleReadingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim()) return;
    onAddReading({
      title: bookTitle.trim(),
      author: author.trim() || 'Autor(a)',
      course: bookCourse.trim() || 'Psicologia',
      status: 'A ler',
      notes: bookNotes.trim() || undefined,
    });
    setBookTitle('');
    setAuthor('');
    setBookCourse('');
    setBookNotes('');
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="date-eyebrow">Faculdade de Psicologia</p>
          <h1 className="page-title">Estudos & Estágio</h1>
          <p className="page-subtitle">
            Disciplinas, controle de faltas, leituras teóricas e horas de estágio.
          </p>
        </div>
      </header>

      {/* Horas de Estágio */}
      <section className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">
            <Clock size={18} style={{ color: 'var(--accent)' }} />
            Horas de Estágio Supervisionado
          </h2>
          <span className="pill pill-accent">
            {internshipHoursDone}h / {internshipHoursTarget}h ({pct}%)
          </span>
        </div>

        <div className="progress-track" style={{ marginBottom: '14px' }}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-ghost"
            onClick={() =>
              onUpdateInternshipHours(internshipHoursDone + 2, internshipHoursTarget)
            }
          >
            + 2h realizadas
          </button>
          <button
            className="btn btn-ghost"
            onClick={() =>
              onUpdateInternshipHours(internshipHoursDone + 4, internshipHoursTarget)
            }
          >
            + 4h realizadas
          </button>
          <button
            className="btn btn-ghost"
            onClick={() =>
              onUpdateInternshipHours(Math.max(0, internshipHoursDone - 1), internshipHoursTarget)
            }
          >
            - 1h
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Meta (h):</span>
            <input
              type="number"
              className="input"
              style={{ width: '90px' }}
              value={internshipHoursTarget}
              onChange={(e) =>
                onUpdateInternshipHours(internshipHoursDone, Math.max(1, Number(e.target.value)))
              }
            />
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        {/* Disciplinas */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">
              <GraduationCap size={18} style={{ color: 'var(--accent)' }} />
              Disciplinas ({courses.length})
            </h2>
          </div>

          <form onSubmit={handleCourseSubmit} className="list-stack" style={{ marginBottom: '16px' }}>
            <div className="form-grid">
              <input
                className="input"
                placeholder="Nome da matéria"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Professor(a)"
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
              />
            </div>
            <div className="form-grid">
              <input
                className="input"
                placeholder="Semestre (ex: 7º Semestre)"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              />
              <input
                className="input"
                placeholder="Próxima prova/entrega"
                value={nextExam}
                onChange={(e) => setNextExam(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={15} /> Adicionar
              </button>
            </div>
          </form>

          <div className="list-stack">
            {courses.map((c) => (
              <div
                key={c.id}
                style={{
                  background: 'var(--bg-card-soft)',
                  padding: '14px',
                  borderRadius: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {c.semester} · {c.professor}
                    </div>
                  </div>
                  <button className="btn-icon" onClick={() => onDeleteCourse(c.id)} title="Remover">
                    <Trash2 size={15} />
                  </button>
                </div>

                {c.nextExam && (
                  <div style={{ marginTop: '8px' }}>
                    <span className="pill pill-warning">{c.nextExam}</span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '10px',
                    gap: '12px',
                    fontSize: '0.8rem',
                  }}
                >
                  <span>
                    Faltas: <strong>{c.absences}</strong> / {c.maxAbsences}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 9px', fontSize: '0.75rem' }}
                      onClick={() => onUpdateCourse(c.id, { absences: c.absences + 1 })}
                    >
                      +1 falta
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 9px', fontSize: '0.75rem' }}
                      onClick={() =>
                        onUpdateCourse(c.id, { progress: Math.min(100, c.progress + 10) })
                      }
                    >
                      +10% ({c.progress}%)
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Leituras & Fichamentos */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">
              <BookOpen size={18} style={{ color: 'var(--accent)' }} />
              Leituras & Fichamentos ({readings.length})
            </h2>
          </div>

          <form onSubmit={handleReadingSubmit} className="list-stack" style={{ marginBottom: '16px' }}>
            <div className="form-grid">
              <input
                className="input"
                placeholder="Livro ou artigo"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Autor(a)"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
            <div className="form-grid">
              <input
                className="input"
                placeholder="Matéria / Abordagem"
                value={bookCourse}
                onChange={(e) => setBookCourse(e.target.value)}
              />
              <input
                className="input"
                placeholder="Notas / Capítulo"
                value={bookNotes}
                onChange={(e) => setBookNotes(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={15} /> Salvar
              </button>
            </div>
          </form>

          <div className="list-stack">
            {readings.map((r) => (
              <div
                key={r.id}
                style={{
                  background: 'var(--bg-card-soft)',
                  padding: '14px',
                  borderRadius: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{r.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {r.author} · {r.course}
                    </div>
                  </div>
                  <button className="btn-icon" onClick={() => onDeleteReading(r.id)} title="Excluir">
                    <Trash2 size={15} />
                  </button>
                </div>

                {r.notes && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {r.notes}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {READING_STATUSES.map((st) => (
                    <button
                      key={st}
                      className={`btn ${r.status === st ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                      onClick={() => onUpdateReadingStatus(r.id, st)}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
