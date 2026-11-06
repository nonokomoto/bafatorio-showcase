import { createContext } from 'react';

// Provides events-per-day lookup to the mobile dateCellWrapper.
export const DayEventsCtx = createContext(null);

// Provides the event-day predicate to the month dateHeader so the number can be
// emphasised on the event's own days (matches the background tint applied via
// dayPropGetter — see ScheduleCalendar).
export const EventDayCtx = createContext(null);

// Provides the "+ N mais" handler to the custom showMore component.
// rbc's onShowMore callback only gives us (events, date, slot) without a
// DOM target; using a custom component lets us capture the rect on click.
export const ShowMoreCtx = createContext(null);

// Provides { authors, hiddenAuthorIds, onToggleAuthor } to the author-filter
// row in the toolbar. Same reason as the others: rbc instantiates the toolbar
// itself and only passes its own contract — there is no prop path.
export const AuthorFilterCtx = createContext(null);
