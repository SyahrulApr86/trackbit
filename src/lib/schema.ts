import { pgTable, text, timestamp, integer, pgEnum, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const priorityEnum = pgEnum('priority', ['Low', 'Medium', 'High']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const productBacklogLists = pgTable('product_backlog_lists', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const epics = pgTable('epics', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  productBacklogListId: uuid('product_backlog_list_id').notNull().references(() => productBacklogLists.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const pbis = pgTable('pbis', {
  id: uuid('id').defaultRandom().primaryKey(),
  pic: text('pic').notNull(),
  title: text('title').notNull(),
  priority: priorityEnum('priority').notNull(),
  storyPoint: integer('story_point').notNull(),
  businessValue: text('business_value').notNull(),
  userStory: text('user_story').notNull(),
  acceptanceCriteria: text('acceptance_criteria').notNull(),
  notes: text('notes'),
  epicId: uuid('epic_id').references(() => epics.id, { onDelete: 'set null' }),
  productBacklogListId: uuid('product_backlog_list_id').notNull().references(() => productBacklogLists.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  productBacklogLists: many(productBacklogLists),
}));

export const productBacklogListsRelations = relations(productBacklogLists, ({ one, many }) => ({
  user: one(users, {
    fields: [productBacklogLists.userId],
    references: [users.id],
  }),
  epics: many(epics),
  pbis: many(pbis),
}));

export const epicsRelations = relations(epics, ({ one, many }) => ({
  productBacklogList: one(productBacklogLists, {
    fields: [epics.productBacklogListId],
    references: [productBacklogLists.id],
  }),
  pbis: many(pbis),
}));

export const pbisRelations = relations(pbis, ({ one }) => ({
  epic: one(epics, {
    fields: [pbis.epicId],
    references: [epics.id],
  }),
  productBacklogList: one(productBacklogLists, {
    fields: [pbis.productBacklogListId],
    references: [productBacklogLists.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ProductBacklogList = typeof productBacklogLists.$inferSelect;
export type NewProductBacklogList = typeof productBacklogLists.$inferInsert;
export type Epic = typeof epics.$inferSelect;
export type NewEpic = typeof epics.$inferInsert;
export type PBI = typeof pbis.$inferSelect;
export type NewPBI = typeof pbis.$inferInsert;