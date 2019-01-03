import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { bufferedProperty } from "discourse/mixins/buffered-content";
import computed from "ember-addons/ember-computed-decorators";

let _components = {};

export default Ember.Component.extend(bufferedProperty("reviewable"), {
  tagName: "",
  updating: null,
  editing: false,

  @computed("reviewable.type")
  customClass(type) {
    return type.dasherize();
  },

  // Find a component to render, if one exists. For example:
  // `ReviewableUser` will return `reviewable-user`
  @computed("reviewable.type")
  reviewableComponent(type) {
    if (_components[type] !== undefined) {
      return _components[type];
    }

    let dasherized = Ember.String.dasherize(type);
    let template = Ember.TEMPLATES[`components/${dasherized}`];
    if (template) {
      _components[type] = dasherized;
      return dasherized;
    }
    _components[type] = null;
  },

  actions: {
    edit() {
      this.set("editing", true);
    },

    cancelEdit() {
      this.set("editing", false);
      this.rollbackBuffer();
    },

    saveEdit() {
      let reviewable = this.get("reviewable");
      let buffered = this.get("buffered");
      let updates = { payload: {} };

      reviewable.get("editable_fields").forEach(f => {
        Ember.set(updates, f.id, buffered.get(f.id));
      });

      reviewable
        .update(updates)
        .then(() => {
          this.set("editing", false);
          this.commitBuffer();
        })
        .catch(popupAjaxError);
    },

    perform(actionId) {
      let reviewable = this.get("reviewable");
      this.set("updating", true);
      ajax(`/review/${reviewable.id}/perform/${actionId}`, { method: "PUT" })
        .then(result => {
          if (result.reviewable_perform_result.success) {
            this.attrs.remove(reviewable);
          }
        })
        .catch(popupAjaxError)
        .finally(() => {
          this.set("updating", false);
        });
    }
  }
});
