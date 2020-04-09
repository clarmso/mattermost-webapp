// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// ***************************************************************
// - [#] indicates a test step (e.g. # Go to a page)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element ID when selecting an element. Create one if none.
// ***************************************************************

// Stage: @prod
// Group: @messaging @smoke

import * as MESSAGES from '../../fixtures/messages';
import users from '../../fixtures/users.json';

const sysadmin = users.sysadmin;

function shouldHavePostProfileImageVisible(isVisible = true) {
    cy.getLastPostId().then((postID) => {
        const target = `#post_${postID}`;
        if (isVisible) {
            cy.get(target).invoke('attr', 'class').
                should('contain', 'current--user').
                and('contain', 'other--root');

            cy.get(`${target} > div[data-testid='postContent'] > .post__img`).should('be.visible');
        } else {
            cy.get(target).invoke('attr', 'class').
                should('contain', 'current--user').
                and('contain', 'same--user').
                and('contain', 'same--root');

            cy.get(`${target} > div[data-testid='postContent'] > .post__img`).
                should('be.visible').
                and('be.empty');
        }
    });
}

describe('Message', () => {
    before(() => {
        // # Login as "user-1" and go to /
        cy.apiLogin('user-1');
        cy.visit('/ad-1/channels/town-square');
    });

    it('M13701 Consecutive message does not repeat profile info', () => {
        // # Wait for posts to load
        cy.get('#postListContent').should('be.visible');

        // # Post a message to force next user message to display a message
        cy.getCurrentChannelId().then((channelId) => {
            cy.postMessageAs({sender: sysadmin, message: 'Hello', channelId});
        });

        // # Post message "One"
        cy.postMessage('One');

        // * Check profile image is visible
        shouldHavePostProfileImageVisible(true);

        // # Post message "Two"
        cy.postMessage('Two');

        // * Check profile image is not visible
        shouldHavePostProfileImageVisible(false);

        // # Post message "Three"
        cy.postMessage('Three');

        // * Check profile image is not visible
        shouldHavePostProfileImageVisible(false);
    });

    it('M14012 Focus move to main input box when a character key is selected', () => {
        // # Post message
        cy.postMessage('Message');

        cy.getLastPostId().then((postId) => {
            const divPostId = `#post_${postId}`;

            // # Left click on post to move the focus out of the main input box
            cy.get(divPostId).click();

            // # Push a character key such as "A"
            cy.get('#post_textbox').type('A');

            // # Open the "..." menu on a post in the main to move the focus out of the main input box
            cy.clickPostDotMenu(postId);

            // # Push a character key such as "A"
            cy.get('#post_textbox').type('A');

            // * Focus is moved back to the main input and the keystroke is captured
            cy.focused().should('have.id', 'post_textbox');
            cy.focused().should('contain', 'AA');
        });
    });

    it('M14320 @here, @all and @channel (ending in a period) still highlight', () => {
        // # Change settings to allow @channel messages
        cy.apiPatchMe({notify_props: {channel: 'true'}});

        // # Login as sysadmin the create/login as new user
        cy.apiLogin('sysadmin');
        cy.apiCreateAndLoginAsNewUser().then(() => {
            // # Create new team and visit its URL
            cy.apiCreateTeam('test-team', 'Test Team').then((response) => {
                cy.visit(`/${response.body.name}`);
            });
        });

        // # Post message
        cy.postMessage('@here. @all. @channel.');

        cy.getLastPostId().then((postId) => {
            const divPostId = `#postMessageText_${postId}`;

            // * Check that the message contains the whole content sent ie. mentions with dots.
            cy.get(divPostId).find('p').should('have.text', '@here. @all. @channel.');

            // * Check that only the at-mention are inside span.mention--highlight
            cy.get(divPostId).find('.mention--highlight').
                first().should('have.text', '@here').should('not.have.text', '.').
                next().should('have.text', '@all').should('not.have.text', '.').
                next().should('have.text', '@channel').should('not.have.text', '.');
        });
    });

    it('MM-2954 /me message should be formatted like a system message', () => {
        // # Post message
        cy.postMessage('/me hello there');

        cy.getLastPostId().then((postId) => {
            const divPostId = `#post_${postId}`;

            // * Check that message has the css class needed for system message styling
            cy.get(divPostId).should('have.class', 'post--system');
        });
    });

    it('message with emoji contains hidden shortcode text', () => {
        const message = 'This post has a shortcode emoji :raising_hand_man: within it.';

        // # Post a message with a shortcode emoji
        cy.postMessage(message);

        cy.getLastPostId().then((postId) => {
            const divPostId = `#post_${postId}`;

            // * Check that message matches what was posted with the emoji omitted
            cy.get(`#postMessageText_${postId}`).should('have.text', message);

            // * Check that the emoji image contains the hidden shortcode text
            cy.get(divPostId).find('span.emoticon').should('have.text', ':raising_hand_man:');
        });
    });

    it('message with unicode emoji displays the unicode and not a span with background image', () => {
        // # Post a message with a shortcode emoji
        cy.postMessage('This post a unicode emoji in a code snippet: `😉`');

        cy.getLastPostId().then((postId) => {
            const divPostId = `#post_${postId}`;

            cy.get(divPostId).find('span.emoticon').should('not.exist');
            cy.get(divPostId).find('span.codespan__pre-wrap code').should('have.text', '😉');
        });
    });

    it('M23361 Focus remains in the RHS text box', () => {
        cy.postMessage(MESSAGES.MEDIUM);
        cy.clickPostCommentIcon();
        cy.postMessageReplyInRHS(MESSAGES.SMALL);
        cy.get('#reply_textbox').should('be.focused');
    });
});
